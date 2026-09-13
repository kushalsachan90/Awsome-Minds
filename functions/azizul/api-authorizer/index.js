const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({});
let cachedToken = null;

async function getExpectedToken() {
  if (cachedToken) return cachedToken;
  if (!process.env.AUTH_TOKEN_PARAMETER) throw new Error('AUTH_TOKEN_PARAMETER is not configured');
  const result = await ssm.send(new GetParameterCommand({
    Name: process.env.AUTH_TOKEN_PARAMETER,
    WithDecryption: true
  }));
  cachedToken = result.Parameter?.Value || null;
  return cachedToken;
}

function extractToken(event) {
  const headers = event?.headers || {};
  const authorization = headers.authorization || headers.Authorization || '';
  if (authorization) return authorization.replace(/^Bearer\s+/i, '').trim();
  const identity = event?.identitySource?.[0] || '';
  return identity.replace(/^Bearer\s+/i, '').trim();
}

exports.handler = async (event) => {
  try {
    const suppliedToken = extractToken(event);
    const expectedToken = await getExpectedToken();
    const allowed = Boolean(suppliedToken && expectedToken && suppliedToken === expectedToken);

    return {
      isAuthorized: allowed,
      context: allowed ? { role: 'operator' } : {}
    };
  } catch (error) {
    console.error('Authorization failed:', error.message);
    return { isAuthorized: false, context: {} };
  }
};
