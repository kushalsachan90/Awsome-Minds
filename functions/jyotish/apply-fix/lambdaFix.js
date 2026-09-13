import {
    LambdaClient,
    UpdateAliasCommand,
    UpdateFunctionConfigurationCommand,
    PutFunctionConcurrencyCommand,
    DeleteFunctionConcurrencyCommand,
    GetFunctionConfigurationCommand,
    GetAliasCommand
} from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({});

const LAMBDA_FIX_ACTIONS = [
    "ROLLBACK_VERSION",
    "INCREASE_MEMORY",
    "DISABLE_FUNCTION"
];

// arn:aws:lambda:region:account-id:function:function-name(:alias-or-version)?
const parseFunctionNameFromArn = (arn) => {
    const parts = arn.split(":");
    if (parts.length < 7 || parts[5] !== "function") {
        throw new Error(`Unable to parse function name from ARN: ${arn}`);
    }
    return parts[6];
};

export const handleLambdaFix = async (event) => {

    const { action, parameters } = event.fix || {};

    // Validate action
    if (!LAMBDA_FIX_ACTIONS.includes(action)) {
        throw new Error(
            `Unsupported Lambda action: ${action}`
        );
    }

    switch (action) {

        case "ROLLBACK_VERSION":
            return await rollbackVersion(event, parameters);

        case "INCREASE_MEMORY":
            return await increaseMemory(event, parameters);

        case "DISABLE_FUNCTION":
            return await disableFunction(event, parameters);

        default:
            throw new Error(
                `Unsupported Lambda action: ${action}`
            );
    }
};

// ROLLBACK_VERSION — point an alias back at a known-good version

const rollbackVersion = async (event, parameters) => {

    const { resourceArn, incidentId } = event;
    const { targetVersion, aliasName = "live" } = parameters;

    const functionName = parseFunctionNameFromArn(resourceArn);

    // Look up the alias's current version first, so we have a
    // record of what we're rolling back FROM, not just TO.
    let previousVersion;
    try {
        const currentAlias = await lambdaClient.send(
            new GetAliasCommand({
                FunctionName: functionName,
                Name: aliasName
            })
        );
        previousVersion = currentAlias.FunctionVersion;
    } catch (err) {
        console.warn("Could not read current alias version:", err.message);
    }

    console.log("Rolling back Lambda:", {
        functionName,
        aliasName,
        from: previousVersion,
        to: targetVersion
    });

    const response = await lambdaClient.send(
        new UpdateAliasCommand({
            FunctionName: functionName,
            Name: aliasName,
            FunctionVersion: String(targetVersion)
        })
    );

    return {
        success: true,
        incidentId,
        actionTaken: "ROLLBACK_VERSION",
        functionName,
        aliasName,
        previousVersion,
        targetVersion,
        aliasArn: response.AliasArn,
        status: "COMPLETED"
    };
};

// INCREASE_MEMORY — bump memory (often fixes OOM/timeout errors)

const increaseMemory = async (event, parameters) => {

    const { resourceArn, incidentId } = event;
    const { targetMemoryMb } = parameters;

    const functionName = parseFunctionNameFromArn(resourceArn);

    if (!targetMemoryMb || targetMemoryMb < 128 || targetMemoryMb > 10240) {
        throw new Error(
            `Invalid targetMemoryMb: ${targetMemoryMb}. Must be between 128 and 10240.`
        );
    }

    const currentConfig = await lambdaClient.send(
        new GetFunctionConfigurationCommand({ FunctionName: functionName })
    );

    console.log("Increasing Lambda memory:", {
        functionName,
        from: currentConfig.MemorySize,
        to: targetMemoryMb
    });

    await lambdaClient.send(
        new UpdateFunctionConfigurationCommand({
            FunctionName: functionName,
            MemorySize: targetMemoryMb
        })
    );

    return {
        success: true,
        incidentId,
        actionTaken: "INCREASE_MEMORY",
        functionName,
        previousMemoryMb: currentConfig.MemorySize,
        newMemoryMb: targetMemoryMb,
        status: "COMPLETED"
    };
};

// DISABLE_FUNCTION — stop invocations without deleting anything

const disableFunction = async (event, parameters) => {

    const { resourceArn, incidentId } = event;
    const functionName = parseFunctionNameFromArn(resourceArn);

    console.log("Disabling Lambda invocations:", { functionName });

    // ReservedConcurrentExecutions: 0 blocks all new invocations.
    // This is reversible — call re-enableFunction() (below) to undo.
    await lambdaClient.send(
        new PutFunctionConcurrencyCommand({
            FunctionName: functionName,
            ReservedConcurrentExecutions: 0
        })
    );

    return {
        success: true,
        incidentId,
        actionTaken: "DISABLE_FUNCTION",
        functionName,
        status: "COMPLETED"
    };
};


// Optional helper — reverse a DISABLE_FUNCTION action
// (not wired into the switch statement; call directly if needed)

export const reEnableFunction = async (resourceArn) => {
    const functionName = parseFunctionNameFromArn(resourceArn);

    await lambdaClient.send(
        new DeleteFunctionConcurrencyCommand({ FunctionName: functionName })
    );

    return { success: true, functionName, status: "RE_ENABLED" };
};