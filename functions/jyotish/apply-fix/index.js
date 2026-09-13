import { handleLambdaFix } from "./lambdaFix.js";

export const handler = async (event) => {

    console.log(
        "Apply Fix Lambda received:",
        JSON.stringify(event)
    );

    // 1. Human approval
    if (!event.approval?.approved) {
        return {
            success: false,
            incidentId: event.incidentId,
            actionTaken: "NONE",
            status: "REJECTED",
            message: "Fix was not approved"
        };
    }

    // 2. Extract fix
    const { action, parameters } = event.fix || {};
    const { resourceType } = event;

    if (!action) {
        throw new Error("Missing fix action");
    }

    if (!resourceType) {
        throw new Error("Missing resource type");
    }

    // 3. Dispatch
    switch (resourceType) {

        case "Lambda":
            return await handleLambdaFix(event);

        case "EC2":
            return await handleEC2Fix(event);

        case "DynamoDB":
            return await handleDynamoDBFix(event);

        default:
            throw new Error(
                `Unsupported resource type: ${resourceType}`
            );
    }
};