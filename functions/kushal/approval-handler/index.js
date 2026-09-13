import {
    DynamoDBClient,
    UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

const dynamoDBClient = new DynamoDBClient({});

const TABLE_NAME = "SelfHealingIncidents";

export const handler = async (event) => {
    console.log(
        "Approval Handler received:",
        JSON.stringify(event)
    );

    const taskToken = event.taskToken;
    const incident = event.incident || {};

    const incidentId = incident.incidentId;

    if (!taskToken) {
        throw new Error("Missing Step Functions task token");
    }

    if (!incidentId) {
        throw new Error("Missing incidentId");
    }

    await dynamoDBClient.send(
        new UpdateItemCommand({
            TableName: TABLE_NAME,

            Key: {
                incidentId: {
                    S: incidentId
                }
            },

            UpdateExpression:
                "SET taskToken = :taskToken, approvalStatus = :status",

            ExpressionAttributeValues: {
                ":taskToken": {
                    S: taskToken
                },
                ":status": {
                    S: "PENDING"
                }
            }
        })
    );

    console.log(
        `Approval request stored for incident: ${incidentId}`
    );

    return {
        success: true,
        incidentId,
        status: "WAITING_FOR_APPROVAL"
    };
};