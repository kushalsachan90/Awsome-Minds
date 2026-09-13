const { DynamoDBClient, GetItemCommand, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { SFNClient, SendTaskFailureCommand, SendTaskSuccessCommand } = require('@aws-sdk/client-sfn');

const db = new DynamoDBClient({});
const sfn = new SFNClient({});
const TABLE = process.env.INCIDENT_TABLE;

const cors = {
  'access-control-allow-origin': process.env.ALLOW_ORIGIN || '*',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-allow-methods': 'GET,OPTIONS,POST'
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', ...cors },
  body: JSON.stringify(body)
});

const unmarshall = (item = {}) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value.S ?? value.N ?? value.BOOL ?? value.NULL ?? value]));

function getRoute(event) {
  return event?.routeKey || `${event?.requestContext?.http?.method || event?.httpMethod || ''} ${event?.rawPath || event?.path || ''}`;
}

function getIncidentId(event) {
  return event?.pathParameters?.incidentId || event?.pathParameters?.id;
}

async function listIncidents() {
  const result = await db.send(new ScanCommand({ TableName: TABLE }));
  const incidents = (result.Items || []).map(unmarshall);
  incidents.sort((a, b) => String(b.diagnosedAt || b.incidentId).localeCompare(String(a.diagnosedAt || a.incidentId)));
  return incidents;
}

async function decide(event, approved) {
  const incidentId = getIncidentId(event);
  if (!incidentId) return response(400, { message: 'incidentId is required' });

  const result = await db.send(new GetItemCommand({
    TableName: TABLE,
    Key: { incidentId: { S: incidentId } }
  }));
  if (!result.Item) return response(404, { message: 'Incident not found' });

  const incident = unmarshall(result.Item);
  if (incident.status !== 'AWAITING_APPROVAL') {
    return response(409, { message: `Incident is not awaiting approval. Current status: ${incident.status || 'UNKNOWN'}` });
  }
  if (!incident.approvalTaskToken) {
    return response(409, { message: 'Approval task token is missing for this incident' });
  }

  const authorizer = event?.requestContext?.authorizer || {};
  const approvedBy = authorizer.lambda?.role || authorizer.role || 'authorized-operator';
  const now = new Date().toISOString();

  if (approved) {
    await sfn.send(new SendTaskSuccessCommand({
      taskToken: incident.approvalTaskToken,
      output: JSON.stringify({ approved: true, approvedBy, approvedAt: now })
    }));
  } else {
    await sfn.send(new SendTaskFailureCommand({
      taskToken: incident.approvalTaskToken,
      error: 'RejectedByOperator',
      cause: 'Human operator rejected the remediation.'
    }));
  }

  await db.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { incidentId: { S: incidentId } },
    UpdateExpression: 'SET #status = :status, approvedBy = :by, approvedAt = :at REMOVE approvalTaskToken',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': { S: approved ? 'APPROVED' : 'REJECTED' },
      ':by': { S: approvedBy },
      ':at': { S: now }
    }
  }));

  return response(200, { incidentId, status: approved ? 'APPROVED' : 'REJECTED', approvedBy, approvedAt: now });
}

exports.handler = async (event) => {
  if (!TABLE) return response(500, { message: 'INCIDENT_TABLE is not configured' });
  if ((event?.requestContext?.http?.method || event?.httpMethod) === 'OPTIONS') return response(204, {});

  try {
    const route = getRoute(event);
    const method = event?.requestContext?.http?.method || event?.httpMethod || '';

    if (method === 'GET' && (route.includes('/incidents') || route.includes('GET'))) {
      const incidentId = getIncidentId(event);
      if (incidentId) {
        const result = await db.send(new GetItemCommand({ TableName: TABLE, Key: { incidentId: { S: incidentId } } }));
        if (!result.Item) return response(404, { message: 'Incident not found' });
        return response(200, { incident: unmarshall(result.Item) });
      }
      return response(200, { incidents: await listIncidents() });
    }

    if (method === 'POST' && route.includes('/approve')) return decide(event, true);
    if (method === 'POST' && route.includes('/reject')) return decide(event, false);

    return response(404, { message: 'Route not found' });
  } catch (error) {
    console.error('Approval API error:', error);
    return response(500, { message: 'Unable to process the request' });
  }
};
