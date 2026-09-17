import { handleLambdaFix } from "./lambdaFix.js";
import { handleDynamoDbFix } from "./dynamodbFix.js";
import { handleEc2Fix } from "./ec2Fix.js";
export const handler = async (event) => {

    console.log(
        "Apply Fix Lambda received:",
        JSON.stringify(event)
    );

    if (!event.approval?.approved) {
        return {
            success: false,
            incidentId: event.incidentId,
            actionTaken: "NONE",
            status: "REJECTED",
            message: "Fix was not approved"
        };
    }

    const { action, parameters } = event.fix || {};
    const { resourceType } = event;

    if (!action) {
        throw new Error("Missing fix action");
    }

    if (!resourceType) {
        throw new Error("Missing resource type");
    }

    switch (resourceType) {

        case "Lambda":
            return await handleLambdaFix(event);

        case "EC2":
            return await handleEc2Fix(event);

        case "DynamoDB":
            return await handleDynamoDbFix(event);

        default:
            throw new Error(
                `Unsupported resource type: ${resourceType}`
            );
    }
};