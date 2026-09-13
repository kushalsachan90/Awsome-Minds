
import {
    LambdaClient,
    UpdateAliasCommand,
    UpdateFunctionConfigurationCommand,
    PutFunctionConcurrencyCommand,
    DeleteFunctionConcurrencyCommand,
    GetFunctionConfigurationCommand,
    GetAliasCommand,
    ListVersionsByFunctionCommand
} from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({});

const LAMBDA_FIX_ACTIONS = [
    "ROLLBACK_VERSION",
    "INCREASE_MEMORY",
    "DISABLE_FUNCTION"
];

// arn:aws:lambda:region:account-id:function:function-name(:alias-or-version)?
const parseFunctionNameFromArn = (arn) => {
    if (!arn) {
        throw new Error("Missing resourceArn");
    }

    const parts = arn.split(":");

    if (parts.length < 7 || parts[5] !== "function") {
        throw new Error(
            `Unable to parse function name from ARN: ${arn}`
        );
    }

    return parts[6];
};

export const handleLambdaFix = async (event) => {

    const { action, parameters = {} } = event.fix || {};

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


// ============================================================
// ROLLBACK_VERSION
// ============================================================
// Points the alias back to the previous published Lambda version.
//
// Example:
//
// live -> version 3
//
// AI says:
// targetVersion = "$LATEST_STABLE"
//
// Apply-Fix resolves:
// $LATEST_STABLE -> version 2
//
// Then:
//
// live -> version 2
// ============================================================

const rollbackVersion = async (event, parameters) => {

    const { resourceArn, incidentId } = event;

    const {
        targetVersion,
        aliasName = "live"
    } = parameters;

    if (!targetVersion) {
        throw new Error(
            "Missing targetVersion"
        );
    }

    const functionName = parseFunctionNameFromArn(resourceArn);

    // --------------------------------------------------------
    // 1. Get current alias/version
    // --------------------------------------------------------

    const currentAlias = await lambdaClient.send(
        new GetAliasCommand({
            FunctionName: functionName,
            Name: aliasName
        })
    );

    const previousVersion = currentAlias.FunctionVersion;

    console.log("Current Lambda alias:", {
        functionName,
        aliasName,
        version: previousVersion
    });


    // --------------------------------------------------------
    // 2. Resolve AI symbolic version
    // --------------------------------------------------------

    let resolvedTargetVersion = String(targetVersion);

    if (
        resolvedTargetVersion === "$LATEST_STABLE" ||
        resolvedTargetVersion === "$PREVIOUS_STABLE"
    ) {

        console.log(
            "Resolving symbolic target version:",
            resolvedTargetVersion
        );

        const versionsResponse = await lambdaClient.send(
            new ListVersionsByFunctionCommand({
                FunctionName: functionName
            })
        );

        const currentVersionNumber = Number(previousVersion);

        if (!Number.isInteger(currentVersionNumber)) {
            throw new Error(
                `Invalid current Lambda version: ${previousVersion}`
            );
        }

        // Find all published versions older than the
        // currently live version.
        const previousVersions = versionsResponse.Versions
            .map(version => version.Version)
            .filter(version =>
                version !== "$LATEST" &&
                /^\d+$/.test(version) &&
                Number(version) < currentVersionNumber
            )
            .map(Number)
            .sort((a, b) => b - a);


        if (previousVersions.length === 0) {
            throw new Error(
                `No previous published version found for ${functionName}`
            );
        }

        // Highest version below current live version
        // Example:
        //
        // current = 3
        // versions = [1, 2]
        //
        // selected = 2
        resolvedTargetVersion = String(previousVersions[0]);

        console.log(
            "Resolved target version:",
            resolvedTargetVersion
        );
    }


    // --------------------------------------------------------
    // 3. Validate resolved version
    // --------------------------------------------------------

    if (!/^\d+$/.test(resolvedTargetVersion)) {
        throw new Error(
            `Invalid target Lambda version: ${resolvedTargetVersion}`
        );
    }

    if (resolvedTargetVersion === previousVersion) {
        throw new Error(
            `Target version ${resolvedTargetVersion} is already live`
        );
    }


    // --------------------------------------------------------
    // 4. Rollback alias
    // --------------------------------------------------------

    console.log("Rolling back Lambda:", {
        functionName,
        aliasName,
        from: previousVersion,
        to: resolvedTargetVersion
    });

    const response = await lambdaClient.send(
        new UpdateAliasCommand({
            FunctionName: functionName,
            Name: aliasName,
            FunctionVersion: resolvedTargetVersion
        })
    );


    // --------------------------------------------------------
    // 5. Return result
    // --------------------------------------------------------

    return {
        success: true,
        incidentId,
        actionTaken: "ROLLBACK_VERSION",
        functionName,
        aliasName,
        previousVersion,
        targetVersion: resolvedTargetVersion,
        aliasArn: response.AliasArn,
        status: "COMPLETED"
    };
};


// ============================================================
// INCREASE_MEMORY
// ============================================================
// Increases Lambda memory configuration.
// ============================================================

const increaseMemory = async (event, parameters) => {

    const { resourceArn, incidentId } = event;

    const { targetMemoryMb } = parameters;

    const functionName = parseFunctionNameFromArn(resourceArn);


    // Validate memory
    if (
        !Number.isInteger(targetMemoryMb) ||
        targetMemoryMb < 128 ||
        targetMemoryMb > 10240
    ) {
        throw new Error(
            `Invalid targetMemoryMb: ${targetMemoryMb}. ` +
            `Must be an integer between 128 and 10240.`
        );
    }


    // Get current configuration
    const currentConfig = await lambdaClient.send(
        new GetFunctionConfigurationCommand({
            FunctionName: functionName
        })
    );


    console.log("Increasing Lambda memory:", {
        functionName,
        from: currentConfig.MemorySize,
        to: targetMemoryMb
    });


    // Update memory
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


// ============================================================
// DISABLE_FUNCTION
// ============================================================
// Stops new Lambda invocations by setting reserved
// concurrency to 0.
//
// This is reversible.
// ============================================================

const disableFunction = async (event, parameters) => {

    const { resourceArn, incidentId } = event;

    const { reservedConcurrency = 0 } = parameters;

    const functionName = parseFunctionNameFromArn(resourceArn);


    // Safety validation
    if (
        !Number.isInteger(reservedConcurrency) ||
        reservedConcurrency !== 0
    ) {
        throw new Error(
            `Invalid reservedConcurrency: ${reservedConcurrency}. ` +
            `DISABLE_FUNCTION requires reservedConcurrency = 0.`
        );
    }


    console.log("Disabling Lambda invocations:", {
        functionName,
        reservedConcurrency
    });


    // ReservedConcurrentExecutions = 0
    // blocks new invocations.
    await lambdaClient.send(
        new PutFunctionConcurrencyCommand({
            FunctionName: functionName,
            ReservedConcurrentExecutions: reservedConcurrency
        })
    );


    return {
        success: true,
        incidentId,
        actionTaken: "DISABLE_FUNCTION",
        functionName,
        reservedConcurrency,
        status: "COMPLETED"
    };
};


// ============================================================
// RE-ENABLE FUNCTION
// ============================================================
// Removes reserved concurrency restriction.
// ============================================================

export const reEnableFunction = async (resourceArn) => {

    const functionName = parseFunctionNameFromArn(resourceArn);

    await lambdaClient.send(
        new DeleteFunctionConcurrencyCommand({
            FunctionName: functionName
        })
    );

    return {
        success: true,
        functionName,
        status: "RE_ENABLED"
    };
};

