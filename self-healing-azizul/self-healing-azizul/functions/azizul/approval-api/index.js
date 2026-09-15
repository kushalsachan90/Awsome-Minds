
const {
    DynamoDBClient,
    GetItemCommand,
    ScanCommand,
    UpdateItemCommand
} = require("@aws-sdk/client-dynamodb");

const {
    SFNClient,
    SendTaskSuccessCommand,
    SendTaskFailureCommand
} = require("@aws-sdk/client-sfn");

const { unmarshall } = require("@aws-sdk/util-dynamodb");

const db = new DynamoDBClient({});
const sfn = new SFNClient({});
const table = process.env.INCIDENT_TABLE;

const cors = {
    "access-control-allow-origin": process.env.ALLOW_ORIGIN || "",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS"
};

const reply = (statusCode, body) => ({
    statusCode,
    headers: {
        "content-type": "application/json",
        ...cors
    },
    body: JSON.stringify(body)
});

const method = (e) =>
    e.requestContext?.http?.method ||
    e.httpMethod ||
    "";

const route = (e) =>
    e.routeKey ||
    `${method(e)} ${e.rawPath || e.path || ""}`;

const id = (e) =>
    e.pathParameters?.incidentId ||
    e.pathParameters?.id;

const parse = (e) => {
    try {
        return e.body ? JSON.parse(e.body) : {};
    } catch {
        throw Object.assign(
            new Error("Request body must be valid JSON"),
            { statusCode: 400 }
        );
    }
};

const actor = (e) => {
    const a = e.requestContext?.authorizer || {};

    return (
        a.jwt?.claims?.email ||
        a.jwt?.claims?.username ||
        a.lambda?.email ||
        a.lambda?.username ||
        a.lambda?.sub ||
        "authorized-operator"
    );
};

const cursor = (value) =>
    value
        ? JSON.parse(
              Buffer.from(value, "base64url").toString("utf8")
          )
        : undefined;


/* =========================
   GET /incidents
   ========================= */

async function list(e) {
    

    const result = await db.send(
        new ScanCommand({
            TableName: table,
            ExclusiveStartKey: cursor(
                e.queryStringParameters?.cursor
            )
        })
    );

    // taskToken is never exposed to the frontend.
    // Existing DynamoDB field is taskToken.
    const incidents = (result.Items || [])
        .map(unmarshall)
        .map(({ taskToken, ...safe }) => safe);

    incidents.sort((a, b) =>
        String(
            b.diagnosedAt || b.incidentId
        ).localeCompare(
            String(
                a.diagnosedAt || a.incidentId
            )
        )
    );

    return reply(200, {
        incidents,
        nextCursor: result.LastEvaluatedKey
            ? Buffer.from(
                  JSON.stringify(
                      result.LastEvaluatedKey
                  )
              ).toString("base64url")
            : null
    });
}


/* =========================
   GET /incidents/:id
   ========================= */

async function detail(e) {
    const result = await db.send(
        new GetItemCommand({
            TableName: table,
            Key: {
                incidentId: {
                    S: id(e)
                }
            }
        })
    );

    if (!result.Item) {
        return reply(404, {
            message: "Incident not found"
        });
    }

    // Do not expose Step Functions taskToken.
    const { taskToken, ...incident } =
        unmarshall(result.Item);

    return reply(200, {
        incident
    });
}


/* =========================
   APPROVE / REJECT
   ========================= */

async function decide(e, approved) {
    const incidentId = id(e);

    if (!incidentId) {
        return reply(400, {
            message: "incidentId is required"
        });
    }

    const input = parse(e);

    if (
        !approved &&
        !String(input.reason || "").trim()
    ) {
        return reply(400, {
            message: "A rejection reason is required"
        });
    }

    const now = new Date().toISOString();
    const who = actor(e);

    let incident;


    /* =========================
       STEP 1: LOCK INCIDENT
       ========================= */

    try {
        const locked = await db.send(
            new UpdateItemCommand({
                TableName: table,

                Key: {
                    incidentId: {
                        S: incidentId
                    }
                },

                // Existing backend schema:
                // approvalStatus = PENDING
                // taskToken exists
                ConditionExpression:
                    "#status = :waiting AND attribute_exists(taskToken)",

                // Temporarily lock the decision.
                UpdateExpression:
                    "SET #status = :progress, decisionBy = :by, decisionAt = :at, rejectionReason = :reason",

                ExpressionAttributeNames: {
                    "#status": "approvalStatus"
                },

                ExpressionAttributeValues: {
                    ":waiting": {
                        S: "PENDING"
                    },

                    ":progress": {
                        S: "APPROVAL_IN_PROGRESS"
                    },

                    ":by": {
                        S: who
                    },

                    ":at": {
                        S: now
                    },

                    ":reason": {
                        S: approved
                            ? ""
                            : String(
                                  input.reason
                              ).trim()
                    }
                },

                ReturnValues: "ALL_NEW"
            })
        );

        incident = unmarshall(
            locked.Attributes
        );

    } catch (error) {
        if (
            error.name ===
            "ConditionalCheckFailedException"
        ) {
            return reply(409, {
                message:
                    "This incident was already decided or is not ready for approval."
            });
        }

        throw error;
    }


    /* =========================
       STEP 2: RESUME STEP FUNCTIONS
       ========================= */

    try {
        if (approved) {
            await sfn.send(
                new SendTaskSuccessCommand({
                    // Existing DynamoDB field:
                    // taskToken
                    taskToken: incident.taskToken,

                    output: JSON.stringify({
                        approved: true,
                        approvedBy: who,
                        approvedAt: now
                    })
                })
            );
        } else {
            await sfn.send(
                new SendTaskFailureCommand({
                    taskToken: incident.taskToken,
                    error: "RejectedByOperator",
                    cause: String(
                        input.reason
                    ).trim()
                })
            );
        }

    } catch (error) {

        // Roll back temporary lock if Step Functions
        // callback failed.
        await db.send(
            new UpdateItemCommand({
                TableName: table,

                Key: {
                    incidentId: {
                        S: incidentId
                    }
                },

                ConditionExpression:
                    "#status = :progress",

                UpdateExpression:
                    "SET #status = :waiting REMOVE decisionBy, decisionAt, rejectionReason",

                ExpressionAttributeNames: {
                    "#status": "approvalStatus"
                },

                ExpressionAttributeValues: {
                    ":progress": {
                        S: "APPROVAL_IN_PROGRESS"
                    },

                    ":waiting": {
                        S: "PENDING"
                    }
                }
            })
        );

        throw error;
    }


    /* =========================
       STEP 3: FINAL STATUS
       ========================= */

    const finalStatus = approved
        ? "APPROVED"
        : "REJECTED";

    const auditUpdate = approved
        ? "approvedBy = :by, approvedAt = :at"
        : "rejectedBy = :by, rejectedAt = :at";

    await db.send(
        new UpdateItemCommand({
            TableName: table,

            Key: {
                incidentId: {
                    S: incidentId
                }
            },

            UpdateExpression:
                `SET #status = :final, ${auditUpdate} REMOVE taskToken`,

            ExpressionAttributeNames: {
                "#status": "approvalStatus"
            },

            ExpressionAttributeValues: {
                ":final": {
                    S: finalStatus
                },

                ":by": {
                    S: who
                },

                ":at": {
                    S: now
                }
            }
        })
    );


    /* =========================
       STEP 4: RESPONSE TO FRONTEND
       ========================= */

    return reply(
        200,
        approved
            ? {
                  incidentId,
                  status: finalStatus,
                  approvedBy: who,
                  approvedAt: now
              }
            : {
                  incidentId,
                  status: finalStatus,
                  rejectedBy: who,
                  rejectedAt: now,
                  rejectionReason:
                      input.reason
              }
    );
}


/* =========================
   LAMBDA HANDLER
   ========================= */

exports.handler = async (event) => {

    if (!table) {
        return reply(500, {
            message:
                "INCIDENT_TABLE is not configured"
        });
    }

    if (method(event) === "OPTIONS") {
        return reply(204, {});
    }

    try {

        if (
            method(event) === "GET" &&
            id(event)
        ) {
            return detail(event);
        }

        if (
            method(event) === "GET" &&
            route(event).includes("/incidents")
        ) {
            return list(event);
        }

        if (
            method(event) === "POST" &&
            route(event).includes("/approve")
        ) {
            return decide(event, true);
        }

        if (
            method(event) === "POST" &&
            route(event).includes("/reject")
        ) {
            return decide(event, false);
        }

        return reply(404, {
            message: "Route not found"
        });

    } catch (error) {

        console.error(
            "Approval API failure",
            error
        );

        return reply(
            error.statusCode || 500,
            {
                message: error.statusCode
                    ? error.message
                    : "Unable to process the request"
            }
        );
    }
};

