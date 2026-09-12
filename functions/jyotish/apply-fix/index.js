export const handler = async (event) => {

    console.log(
        "Apply Fix Lambda received:",
        JSON.stringify(event)
    );

    // human approval
    if (!event.approval?.approved) {
        return {
            success: false,
            incidentId: event.incidentId,
            actionTaken: "NONE",
            status: "REJECTED",
            message: "Fix was not approved"
        };
    }

    const {recommendedAction} = event;

    //  supported action and call aws api for fix
    switch (recommendedAction) {

        case "ROLLBACK_LAMBDA_VERSION":
            return await rollbackLambda(event);

        case "UPDATE_LAMBDA_MEMORY":
            return await updateLambdaMemory(event);

        case "RESTART_EC2":
            return await restartEC2(event);

        default:
            throw new Error(
                `Unsupported action: ${recommendedAction}`
            );
    }
};