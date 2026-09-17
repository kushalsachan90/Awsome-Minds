import "dotenv/config";

import OpenAI from "openai";

import {
    LambdaClient,
    GetFunctionConfigurationCommand
} from "@aws-sdk/client-lambda";

import {
    DynamoDBClient,
    DescribeTableCommand,
    DescribeContinuousBackupsCommand
} from "@aws-sdk/client-dynamodb";

import {
    EC2Client,
    DescribeInstancesCommand
} from "@aws-sdk/client-ec2";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL:
        process.env.OPENAI_BASE_URL ||
        "https://bedrock-mantle.ap-south-1.api.aws/v1"
});

const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION
});

const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION
});

const ec2Client = new EC2Client({
    region: process.env.AWS_REGION
});

const MODEL_ID = "openai.gpt-oss-safeguard-20b";

// --------------------------------------------------
// Allowed Lambda fix actions
// --------------------------------------------------

const LAMBDA_FIX_ACTIONS = Object.freeze({
    ROLLBACK_VERSION: "ROLLBACK_VERSION",
    INCREASE_MEMORY: "INCREASE_MEMORY",
    DISABLE_FUNCTION: "DISABLE_FUNCTION"
});

// --------------------------------------------------
// Allowed DynamoDB fix actions
// --------------------------------------------------

const DYNAMODB_FIX_ACTIONS = Object.freeze({
    UPDATE_PROVISIONED_CAPACITY:
        "UPDATE_PROVISIONED_CAPACITY",

    ENABLE_POINT_IN_TIME_RECOVERY:
        "ENABLE_POINT_IN_TIME_RECOVERY",

    RESTORE_TABLE:
        "RESTORE_TABLE",

    DELETE_ITEM:
        "DELETE_ITEM"
});

// --------------------------------------------------
// Allowed EC2 fix actions
// --------------------------------------------------

const EC2_FIX_ACTIONS = Object.freeze({
    REBOOT_INSTANCE:
        "REBOOT_INSTANCE",

    START_INSTANCE:
        "START_INSTANCE",

    STOP_INSTANCE:
        "STOP_INSTANCE",

    RESIZE_INSTANCE:
        "RESIZE_INSTANCE",

    RESTART_WITH_ROLLBACK_AMI:
        "RESTART_WITH_ROLLBACK_AMI"
});

// --------------------------------------------------
// Validation constants
// --------------------------------------------------

const VALID_SEVERITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL"
];

const VALID_COST_IMPACTS = [
    "Low",
    "Medium",
    "High"
];

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getAllowedFixActions(resourceType) {
    if (resourceType === "Lambda") {
        return Object.values(LAMBDA_FIX_ACTIONS);
    }

    if (resourceType === "DynamoDB") {
        return Object.values(DYNAMODB_FIX_ACTIONS);
    }

    if (resourceType === "EC2") {
        return Object.values(EC2_FIX_ACTIONS);
    }

    return [];
}

// --------------------------------------------------
// DynamoDB ARN parser
// --------------------------------------------------

function getTableNameFromArn(resourceArn) {
    if (!resourceArn) {
        return null;
    }

    const parts = resourceArn.split(":");

    /*
        DynamoDB ARN:

        arn:aws:dynamodb:region:account-id:table/TableName
    */

    if (
        parts.length < 6 ||
        parts[2] !== "dynamodb"
    ) {
        return null;
    }

    const resource = parts[5];

    if (!resource.startsWith("table/")) {
        return null;
    }

    const tableName =
        resource.substring("table/".length);

    return tableName || null;
}

// --------------------------------------------------
// EC2 ARN parser
// --------------------------------------------------

function getInstanceIdFromArn(resourceArn) {
    if (!resourceArn) {
        return null;
    }

    const parts = resourceArn.split(":");

    /*
        EC2 instance ARN:

        arn:aws:ec2:region:account-id:instance/i-1234567890
    */

    if (
        parts.length < 6 ||
        parts[2] !== "ec2"
    ) {
        return null;
    }

    const resource = parts[5];

    if (!resource.startsWith("instance/")) {
        return null;
    }

    const instanceId =
        resource.substring("instance/".length);

    return instanceId || null;
}

// --------------------------------------------------
// Handler
// --------------------------------------------------

export const handler = async (event) => {
    console.log(
        "Received event:",
        JSON.stringify(event)
    );

    // --------------------------------------------------
    // 1. Validate API configuration
    // --------------------------------------------------

    if (!process.env.OPENAI_API_KEY) {
        throw new Error(
            "OPENAI_API_KEY environment variable is not configured"
        );
    }

    // --------------------------------------------------
    // 2. Validate required incident fields
    // --------------------------------------------------

    const requiredFields = [
        "incidentId",
        "metric",
        "value",
        "threshold"
    ];

    for (const field of requiredFields) {
        if (
            event[field] === undefined ||
            event[field] === null ||
            event[field] === ""
        ) {
            throw new Error(
                `Missing required field: ${field}`
            );
        }
    }

    // --------------------------------------------------
    // 3. Determine resource information
    // --------------------------------------------------

    const resourceArn =
        event.resourceArn || null;

    const resourceType =
        event.resourceType ||
        (
            resourceArn?.includes(":lambda:")
                ? "Lambda"
                : resourceArn?.includes(":dynamodb:")
                    ? "DynamoDB"
                    : resourceArn?.includes(":ec2:")
                        ? "EC2"
                        : "Unknown"
        );

    console.log(
        "Detected resource type:",
        resourceType
    );

    if (
        resourceType !== "Lambda" &&
        resourceType !== "DynamoDB" &&
        resourceType !== "EC2"
    ) {
        throw new Error(
            `Unsupported resource type: ${resourceType}`
        );
    }

    // --------------------------------------------------
    // 4. Read current Lambda configuration
    // --------------------------------------------------

    let currentLambdaConfig = null;

    if (
        resourceType === "Lambda" &&
        resourceArn
    ) {
        console.log(
            "Reading current Lambda configuration:",
            resourceArn
        );

        try {
            const configResponse =
                await lambdaClient.send(
                    new GetFunctionConfigurationCommand({
                        FunctionName: resourceArn
                    })
                );

            currentLambdaConfig = {
                functionName:
                    configResponse.FunctionName || null,

                functionArn:
                    configResponse.FunctionArn ||
                    resourceArn,

                memorySizeMb:
                    configResponse.MemorySize || null,

                timeoutSeconds:
                    configResponse.Timeout || null,

                runtime:
                    configResponse.Runtime || null,

                lastUpdateStatus:
                    configResponse.LastUpdateStatus ||
                    null,

                lastUpdateStatusReason:
                    configResponse.LastUpdateStatusReason ||
                    null,

                state:
                    configResponse.State || null,

                stateReason:
                    configResponse.StateReason || null
            };

            console.log(
                "Current Lambda configuration:",
                JSON.stringify(currentLambdaConfig)
            );
        } catch (error) {
            console.error(
                "Failed to read Lambda configuration:",
                error.message
            );

            throw new Error(
                `Failed to read Lambda configuration: ${
                    error.message || "Unknown error"
                }`
            );
        }
    }

    // --------------------------------------------------
    // 5. Read current DynamoDB configuration
    // --------------------------------------------------

    let currentTableConfig = null;

    if (
        resourceType === "DynamoDB" &&
        resourceArn
    ) {
        const tableName =
            getTableNameFromArn(resourceArn);

        if (!tableName) {
            throw new Error(
                `Unable to determine DynamoDB table name from ARN: ${resourceArn}`
            );
        }

        console.log(
            "Reading current DynamoDB configuration:",
            tableName
        );

        try {
            const tableResponse =
                await dynamoClient.send(
                    new DescribeTableCommand({
                        TableName: tableName
                    })
                );

            const backupResponse =
                await dynamoClient.send(
                    new DescribeContinuousBackupsCommand({
                        TableName: tableName
                    })
                );

            const table =
                tableResponse.Table || {};

            const continuousBackups =
                backupResponse.ContinuousBackupsDescription ||
                {};

            currentTableConfig = {
                tableName:
                    table.TableName || tableName,

                tableArn:
                    table.TableArn || resourceArn,

                tableStatus:
                    table.TableStatus || null,

                billingMode:
                    table.BillingModeSummary?.BillingMode ||
                    null,

                readCapacityUnits:
                    table.ProvisionedThroughput
                        ?.ReadCapacityUnits ??
                    null,

                writeCapacityUnits:
                    table.ProvisionedThroughput
                        ?.WriteCapacityUnits ??
                    null,

                itemCount:
                    table.ItemCount ?? null,

                pointInTimeRecovery:
                    continuousBackups
                        .PointInTimeRecoveryDescription
                        ?.PointInTimeRecoveryStatus ||
                    "DISABLED"
            };

            console.log(
                "Current DynamoDB configuration:",
                JSON.stringify(currentTableConfig)
            );
        } catch (error) {
            console.error(
                "Failed to read DynamoDB configuration:",
                error.message
            );

            throw new Error(
                `Failed to read DynamoDB configuration: ${
                    error.message || "Unknown error"
                }`
            );
        }
    }

    // --------------------------------------------------
    // 6. Read current EC2 configuration
    // --------------------------------------------------

    let currentEc2Config = null;

    if (
        resourceType === "EC2" &&
        resourceArn
    ) {
        const instanceId =
            getInstanceIdFromArn(resourceArn);

        if (!instanceId) {
            throw new Error(
                `Unable to determine EC2 instance ID from ARN: ${resourceArn}`
            );
        }

        console.log(
            "Reading current EC2 configuration:",
            instanceId
        );

        try {
            const response =
                await ec2Client.send(
                    new DescribeInstancesCommand({
                        InstanceIds: [
                            instanceId
                        ]
                    })
                );

            const instance =
                response.Reservations?.[0]
                    ?.Instances?.[0];

            if (!instance) {
                throw new Error(
                    `EC2 instance not found: ${instanceId}`
                );
            }

            currentEc2Config = {
                instanceId:
                    instance.InstanceId ||
                    instanceId,

                instanceArn:
                    resourceArn,

                instanceType:
                    instance.InstanceType ||
                    null,

                state:
                    instance.State?.Name ||
                    null,

                imageId:
                    instance.ImageId ||
                    null,

                subnetId:
                    instance.SubnetId ||
                    null,

                vpcId:
                    instance.VpcId ||
                    null,

                availabilityZone:
                    instance.Placement
                        ?.AvailabilityZone ||
                    null,

                architecture:
                    instance.Architecture ||
                    null,

                keyName:
                    instance.KeyName ||
                    null,

                securityGroupIds:
                    instance.SecurityGroups
                        ?.map(group => group.GroupId)
                        .filter(Boolean) ||
                    [],

                iamInstanceProfileArn:
                    instance.IamInstanceProfile
                        ?.Arn ||
                    null,

                privateIpAddress:
                    instance.PrivateIpAddress ||
                    null,

                publicIpAddress:
                    instance.PublicIpAddress ||
                    null
            };

            console.log(
                "Current EC2 configuration:",
                JSON.stringify(currentEc2Config)
            );
        } catch (error) {
            console.error(
                "Failed to read EC2 configuration:",
                error.message
            );

            throw new Error(
                `Failed to read EC2 configuration: ${
                    error.message || "Unknown error"
                }`
            );
        }
    }

    // --------------------------------------------------
    // 7. Determine allowed actions
    // --------------------------------------------------

    const allowedFixActions =
        getAllowedFixActions(resourceType);

    if (allowedFixActions.length === 0) {
        throw new Error(
            `No fix actions configured for resource type: ${resourceType}`
        );
    }

    // --------------------------------------------------
    // 8. Prepare Bedrock prompt
    // --------------------------------------------------

    const prompt = `You are an infrastructure incident diagnosis assistant.

Your ONLY task is to diagnose the infrastructure incident.

Do NOT perform infrastructure changes.

Do NOT restart resources.

Do NOT terminate resources.

Do NOT modify security groups.

Do NOT modify networking.

Do NOT modify autoscaling.

Do NOT claim that you performed any infrastructure action.

Incident:

${JSON.stringify(event, null, 2)}

Detected resource type:

${resourceType}

Current Lambda configuration:

${JSON.stringify(currentLambdaConfig, null, 2)}

Current DynamoDB configuration:

${JSON.stringify(currentTableConfig, null, 2)}

Current EC2 configuration:

${JSON.stringify(currentEc2Config, null, 2)}

IMPORTANT RESOURCE RULE:

The detected resource type is "${resourceType}".

You MUST ONLY recommend a fix action that belongs to this resource type.

Allowed fix actions for ${resourceType}:

${JSON.stringify(allowedFixActions, null, 2)}

NEVER recommend an action belonging to another resource type.

If resource type is Lambda:

DO NOT use UPDATE_PROVISIONED_CAPACITY.

DO NOT use ENABLE_POINT_IN_TIME_RECOVERY.

DO NOT use RESTORE_TABLE.

DO NOT use DELETE_ITEM.

DO NOT use REBOOT_INSTANCE.

DO NOT use START_INSTANCE.

DO NOT use STOP_INSTANCE.

DO NOT use RESIZE_INSTANCE.

DO NOT use RESTART_WITH_ROLLBACK_AMI.

If resource type is DynamoDB:

DO NOT use ROLLBACK_VERSION.

DO NOT use INCREASE_MEMORY.

DO NOT use DISABLE_FUNCTION.

DO NOT use REBOOT_INSTANCE.

DO NOT use START_INSTANCE.

DO NOT use STOP_INSTANCE.

DO NOT use RESIZE_INSTANCE.

DO NOT use RESTART_WITH_ROLLBACK_AMI.

If resource type is EC2:

DO NOT use ROLLBACK_VERSION.

DO NOT use INCREASE_MEMORY.

DO NOT use DISABLE_FUNCTION.

DO NOT use UPDATE_PROVISIONED_CAPACITY.

DO NOT use ENABLE_POINT_IN_TIME_RECOVERY.

DO NOT use RESTORE_TABLE.

DO NOT use DELETE_ITEM.

Analyze the incident and determine:

1. Most likely root cause

2. Severity

3. Confidence

4. Confidence reason

5. Blast radius

6. Blast radius reason

7. Estimated cost impact

8. Recommended fix action

9. Fix parameters

10. Reason for the fix

Severity MUST be exactly one of:

LOW

MEDIUM

HIGH

CRITICAL

Confidence MUST be a whole number between 0 and 100.

Estimated cost impact MUST be exactly one of:

Low

Medium

High

==================================================
LAMBDA FIX ACTIONS
==================================================

These actions are valid ONLY when resource type is Lambda.

1. ROLLBACK_VERSION

Use this when a recent deployment/version is the likely cause.

Parameters:

{
  "targetVersion": 6,
  "reason": "Rollback to the previous stable Lambda version"
}

Rules:

- targetVersion MUST be a positive integer.

- targetVersion MUST represent an actual previous Lambda version when evidence exists.

- DO NOT use "$LATEST_STABLE".

- DO NOT use a string placeholder.

- DO NOT omit targetVersion.

2. INCREASE_MEMORY

Use this when the Lambda is experiencing memory/resource pressure.

Parameters:

{
  "targetMemoryMb": 256,
  "reason": "Increase memory to reduce memory pressure"
}

Rules:

- targetMemoryMb MUST be an integer.

- targetMemoryMb MUST be between 128 and 10240.

- targetMemoryMb MUST be greater than the current Lambda memory.

- DO NOT use the current memory size again.

3. DISABLE_FUNCTION

Use this only when disabling the Lambda is the safest available mitigation.

Parameters:

{
  "reservedConcurrency": 0,
  "reason": "Disable the function to prevent further failures"
}

Rules:

- reservedConcurrency MUST be exactly 0.

==================================================
DYNAMODB FIX ACTIONS
==================================================

These actions are valid ONLY when resource type is DynamoDB.

1. UPDATE_PROVISIONED_CAPACITY

Use this when a DynamoDB table using PROVISIONED capacity is experiencing capacity pressure.

Parameters:

{
  "readCapacityUnits": 5,
  "writeCapacityUnits": 5,
  "reason": "Increase provisioned capacity to handle the observed workload"
}

Rules:

- readCapacityUnits MUST be a positive integer.

- writeCapacityUnits MUST be a positive integer.

- This action MUST NOT be recommended for PAY_PER_REQUEST tables.

- Prefer a reasonable increase over an extreme increase.

- Consider the current DynamoDB configuration.

2. ENABLE_POINT_IN_TIME_RECOVERY

Use this when point-in-time recovery is disabled and enabling protection is an appropriate remediation.

Parameters:

{
  "reason": "Enable point-in-time recovery to protect the table from accidental data loss"
}

3. RESTORE_TABLE

Use this ONLY when there is evidence that restoring the table from a known recovery point is appropriate.

Parameters:

{
  "targetTableName": "SelfHealing-DynamoDBTestTable-Restored",
  "restoreTime": "2026-09-17T17:00:00Z",
  "reason": "Restore the table to a known healthy recovery point"
}

Rules:

- targetTableName MUST be different from the current table name.

- restoreTime MUST be a valid ISO-8601 timestamp.

- DO NOT invent a restore time if there is no evidence for one.

- If there is insufficient evidence for restoration, choose another applicable DynamoDB action.

4. DELETE_ITEM

Use this ONLY when the incident clearly indicates a specific bad/corrupted item and the exact key is known.

Parameters:

{
  "key": {
    "id": {
      "S": "example"
    }
  },
  "reason": "Delete the identified corrupted item"
}

Rules:

- The exact item key MUST be supported by the incident evidence.

- DO NOT invent an item key.

- DO NOT recommend DELETE_ITEM for a general capacity problem.

==================================================
EC2 FIX ACTIONS
==================================================

These actions are valid ONLY when resource type is EC2.

0. START_INSTANCE

Use this ONLY when the EC2 state-change incident reports:

ec2State = "stopped"

Parameters:

{
  "reason": "Start the stopped EC2 instance to restore service availability"
}

Rules:

- Use START_INSTANCE only when ec2State is "stopped".

- Do not use START_INSTANCE when the instance is already running.

1. REBOOT_INSTANCE

Use this when the EC2 instance is running and a reboot is an appropriate remediation for a temporary instance-level problem.

Parameters:

{
  "reason": "Reboot the affected EC2 instance to recover from the detected temporary issue"
}

Rules:

- The instance should normally be in running state.

- Do not recommend this when there is evidence that the instance must remain stopped.

- Do not use REBOOT_INSTANCE for EC2_STATE_CHANGE incidents.

2. STOP_INSTANCE

Use this ONLY when the EC2 state-change incident reports:

ec2State = "running"

Parameters:

{
  "reason": "Stop the running EC2 instance as requested by the detected state-change incident"
}

Rules:

- Use STOP_INSTANCE only when ec2State is "running".

- Do not use STOP_INSTANCE when the instance is already stopped.

- Do not recommend STOP_INSTANCE merely because CPU utilization is non-zero.

3. RESIZE_INSTANCE

Use this when the EC2 instance type is insufficient for the observed workload or resource pressure.

Parameters:

{
  "targetInstanceType": "t3.small",
  "reason": "Increase instance size to provide additional compute capacity"
}

Rules:

- targetInstanceType MUST be a valid EC2 instance type.

- targetInstanceType MUST be different from the current instance type.

- Consider the current instance type before recommending a resize.

- Prefer a reasonable increase.

- Do not recommend an arbitrary large instance type without evidence.

4. RESTART_WITH_ROLLBACK_AMI

Use this ONLY when there is evidence that the current AMI/software image is the likely cause and a known-good replacement AMI is available.

Parameters:

{
  "targetAmiId": "ami-0123456789abcdef0",
  "reason": "Replace the affected instance with a known-good AMI"
}

Rules:

- targetAmiId MUST match the EC2 AMI format: ami-xxxxxxxxxxxxxxxxx

- DO NOT invent an AMI ID.

- Only recommend this action when the incident evidence provides a known-good AMI.

- If no known-good AMI is available, choose another applicable EC2 action.

- The replacement must preserve the important configuration of the existing instance.

==================================================
EC2 STATE CHANGE RULE
==================================================

If eventType is "EC2_STATE_CHANGE":

- If ec2State is "stopped", the recommended fix action MUST be START_INSTANCE.

- If ec2State is "running", the recommended fix action MUST be STOP_INSTANCE.

- Do not recommend REBOOT_INSTANCE.

- Do not recommend RESIZE_INSTANCE.

- Do not recommend RESTART_WITH_ROLLBACK_AMI.

- Do not recommend any Lambda or DynamoDB action.

The fix action must exactly match the observed EC2 state.

==================================================
IMPORTANT SAFETY RULE
==================================================

If evidence is insufficient for a specific remediation:

Choose the safest applicable action for the detected resource type.

NEVER choose an action belonging to another resource type.

NEVER invent:

- AMI IDs

- Lambda versions

- DynamoDB item keys

- DynamoDB restore timestamps

- EC2 instance types without justification

For EC2_STATE_CHANGE incidents:

- Do not invent a different EC2 state.

- Use the ec2State provided by the event.

- The action MUST correspond to that state.

The "parameters" object MUST match the selected action.

Keep all text concise.

Return ONLY valid JSON.

Do not use markdown.

Do not use code fences.

Do not include explanation outside the JSON.

Do not include your reasoning process.

Return exactly this structure:

{
  "rootCause": "short root cause",
  "severity": "MEDIUM",
  "reason": "short explanation",
  "confidence": 80,
  "confidenceReason": "short reason for confidence",
  "blastRadius": "short blast radius",
  "blastRadiusReason": "short reason",
  "estimatedCostImpact": "Low",
  "fix": {
    "action": "ONE_ALLOWED_ACTION_FOR_THIS_RESOURCE",
    "parameters": {
      "reason": "short reason"
    }
  }
}

The JSON MUST be complete and valid.
`;

    console.log(
        "Sending diagnosis request using",
        MODEL_ID
    );

    // --------------------------------------------------
    // 9. Call Bedrock
    // --------------------------------------------------

    let response;

    try {
        response =
            await client.chat.completions.create({
                model: MODEL_ID,

                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],

                max_tokens: 8000,

                temperature: 0
            });
    } catch (error) {
        console.error(
            "Bedrock invocation failed:",
            error.message
        );

        throw new Error(
            `Bedrock invocation failed: ${
                error.message || "Unknown error"
            }`
        );
    }

    // --------------------------------------------------
    // 10. Extract response
    // --------------------------------------------------

    const choice =
        response?.choices?.[0];

    console.log(
        "Bedrock finish reason:",
        choice?.finish_reason
    );

    const responseText =
        choice?.message?.content;

    if (
        !responseText ||
        typeof responseText !== "string"
    ) {
        throw new Error(
            "Bedrock returned no final answer"
        );
    }

    // --------------------------------------------------
    // 11. Parse JSON
    // --------------------------------------------------

    let diagnosis;

    try {
        diagnosis =
            JSON.parse(
                responseText.trim()
            );
    } catch (error) {
        console.error(
            "Malformed JSON returned by Bedrock:",
            responseText
        );

        throw new Error(
            "Bedrock returned malformed JSON"
        );
    }

    // --------------------------------------------------
    // 12. Validate diagnosis fields
    // --------------------------------------------------

    const diagnosisFields = [
        "rootCause",
        "severity",
        "reason",
        "confidence",
        "confidenceReason",
        "blastRadius",
        "blastRadiusReason",
        "estimatedCostImpact",
        "fix"
    ];

    for (const field of diagnosisFields) {
        if (
            diagnosis[field] === undefined ||
            diagnosis[field] === null ||
            diagnosis[field] === ""
        ) {
            throw new Error(
                `Bedrock response missing field: ${field}`
            );
        }
    }

    // --------------------------------------------------
    // 13. Validate severity
    // --------------------------------------------------

    if (
        !VALID_SEVERITIES.includes(
            diagnosis.severity
        )
    ) {
        throw new Error(
            `Invalid severity returned by Bedrock: ${diagnosis.severity}`
        );
    }

    // --------------------------------------------------
    // 14. Validate confidence
    // --------------------------------------------------

    if (
        typeof diagnosis.confidence !== "number" ||
        !Number.isInteger(diagnosis.confidence) ||
        diagnosis.confidence < 0 ||
        diagnosis.confidence > 100
    ) {
        throw new Error(
            `Invalid confidence returned by Bedrock: ${diagnosis.confidence}`
        );
    }

    // --------------------------------------------------
    // 15. Validate cost impact
    // --------------------------------------------------

    if (
        !VALID_COST_IMPACTS.includes(
            diagnosis.estimatedCostImpact
        )
    ) {
        throw new Error(
            `Invalid estimatedCostImpact returned by Bedrock: ${diagnosis.estimatedCostImpact}`
        );
    }

    // --------------------------------------------------
    // 16. Validate fix object
    // --------------------------------------------------

    if (
        typeof diagnosis.fix !== "object" ||
        diagnosis.fix === null
    ) {
        throw new Error(
            "Bedrock returned an invalid fix object"
        );
    }

    // --------------------------------------------------
    // 17. Validate resource-specific fix action
    // --------------------------------------------------

    if (
        !allowedFixActions.includes(
            diagnosis.fix.action
        )
    ) {
        throw new Error(
            `Invalid fix action "${diagnosis.fix.action}" for resource type "${resourceType}". Allowed actions: ${allowedFixActions.join(", ")}`
        );
    }

    // --------------------------------------------------
    // 18. Validate fix parameters
    // --------------------------------------------------

    if (
        typeof diagnosis.fix.parameters !== "object" ||
        diagnosis.fix.parameters === null
    ) {
        throw new Error(
            "Bedrock returned invalid fix parameters"
        );
    }

    // --------------------------------------------------
    // 19. Validate common fix reason
    // --------------------------------------------------

    if (
        !diagnosis.fix.parameters.reason ||
        typeof diagnosis.fix.parameters.reason !== "string"
    ) {
        throw new Error(
            "Fix parameters must contain a valid reason"
        );
    }

    // --------------------------------------------------
    // 20. Lambda-specific validation
    // --------------------------------------------------

    if (resourceType === "Lambda") {

        // --------------------------------------------------
        // INCREASE_MEMORY
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            LAMBDA_FIX_ACTIONS.INCREASE_MEMORY
        ) {
            const targetMemoryMb =
                diagnosis.fix.parameters.targetMemoryMb;

            if (
                typeof targetMemoryMb !== "number" ||
                !Number.isInteger(targetMemoryMb) ||
                targetMemoryMb < 128 ||
                targetMemoryMb > 10240
            ) {
                throw new Error(
                    `Invalid targetMemoryMb: ${targetMemoryMb}. Must be an integer between 128 and 10240.`
                );
            }

            if (
                currentLambdaConfig?.memorySizeMb !== null &&
                currentLambdaConfig?.memorySizeMb !== undefined &&
                targetMemoryMb <=
                    currentLambdaConfig.memorySizeMb
            ) {
                throw new Error(
                    `Invalid targetMemoryMb: ${targetMemoryMb}. Current memory is ${currentLambdaConfig.memorySizeMb} MB, so target memory must be greater than current memory.`
                );
            }
        }

        // --------------------------------------------------
        // ROLLBACK_VERSION
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            LAMBDA_FIX_ACTIONS.ROLLBACK_VERSION
        ) {
            const targetVersion =
                diagnosis.fix.parameters.targetVersion;

            if (
                typeof targetVersion !== "number" ||
                !Number.isInteger(targetVersion) ||
                targetVersion < 1
            ) {
                throw new Error(
                    `Invalid targetVersion: ${targetVersion}. Must be a positive integer.`
                );
            }
        }

        // --------------------------------------------------
        // DISABLE_FUNCTION
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            LAMBDA_FIX_ACTIONS.DISABLE_FUNCTION
        ) {
            const reservedConcurrency =
                diagnosis.fix.parameters
                    .reservedConcurrency;

            if (
                reservedConcurrency !== 0
            ) {
                throw new Error(
                    `Invalid reservedConcurrency: ${reservedConcurrency}. Must be 0 for DISABLE_FUNCTION.`
                );
            }
        }
    }

    // --------------------------------------------------
    // 21. DynamoDB-specific validation
    // --------------------------------------------------

    if (resourceType === "DynamoDB") {

        // --------------------------------------------------
        // UPDATE_PROVISIONED_CAPACITY
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            DYNAMODB_FIX_ACTIONS.UPDATE_PROVISIONED_CAPACITY
        ) {
            const readCapacityUnits =
                diagnosis.fix.parameters
                    .readCapacityUnits;

            const writeCapacityUnits =
                diagnosis.fix.parameters
                    .writeCapacityUnits;

            if (
                typeof readCapacityUnits !== "number" ||
                !Number.isInteger(readCapacityUnits) ||
                readCapacityUnits < 1
            ) {
                throw new Error(
                    `Invalid readCapacityUnits: ${readCapacityUnits}`
                );
            }

            if (
                typeof writeCapacityUnits !== "number" ||
                !Number.isInteger(writeCapacityUnits) ||
                writeCapacityUnits < 1
            ) {
                throw new Error(
                    `Invalid writeCapacityUnits: ${writeCapacityUnits}`
                );
            }

            if (
                currentTableConfig?.billingMode ===
                "PAY_PER_REQUEST"
            ) {
                throw new Error(
                    "UPDATE_PROVISIONED_CAPACITY cannot be used with PAY_PER_REQUEST table"
                );
            }

            if (
                currentTableConfig?.readCapacityUnits !== null &&
                currentTableConfig?.readCapacityUnits !== undefined &&
                readCapacityUnits <
                    currentTableConfig.readCapacityUnits
            ) {
                console.warn(
                    "Bedrock recommended lower read capacity than current capacity"
                );
            }

            if (
                currentTableConfig?.writeCapacityUnits !== null &&
                currentTableConfig?.writeCapacityUnits !== undefined &&
                writeCapacityUnits <
                    currentTableConfig.writeCapacityUnits
            ) {
                console.warn(
                    "Bedrock recommended lower write capacity than current capacity"
                );
            }
        }

        // --------------------------------------------------
        // ENABLE_POINT_IN_TIME_RECOVERY
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            DYNAMODB_FIX_ACTIONS.ENABLE_POINT_IN_TIME_RECOVERY
        ) {
            if (
                currentTableConfig?.pointInTimeRecovery ===
                "ENABLED"
            ) {
                throw new Error(
                    "Point-in-time recovery is already enabled"
                );
            }
        }

        // --------------------------------------------------
        // RESTORE_TABLE
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            DYNAMODB_FIX_ACTIONS.RESTORE_TABLE
        ) {
            const targetTableName =
                diagnosis.fix.parameters
                    .targetTableName;

            const restoreTime =
                diagnosis.fix.parameters
                    .restoreTime;

            const currentTableName =
                currentTableConfig?.tableName;

            if (
                typeof targetTableName !== "string" ||
                !targetTableName
            ) {
                throw new Error(
                    "RESTORE_TABLE requires targetTableName"
                );
            }

            if (
                targetTableName === currentTableName
            ) {
                throw new Error(
                    "RESTORE_TABLE targetTableName must be different from current table"
                );
            }

            if (
                typeof restoreTime !== "string" ||
                Number.isNaN(
                    Date.parse(restoreTime)
                )
            ) {
                throw new Error(
                    `Invalid restoreTime: ${restoreTime}`
                );
            }
        }

        // --------------------------------------------------
        // DELETE_ITEM
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            DYNAMODB_FIX_ACTIONS.DELETE_ITEM
        ) {
            const key =
                diagnosis.fix.parameters.key;

            if (
                typeof key !== "object" ||
                key === null ||
                Object.keys(key).length === 0
            ) {
                throw new Error(
                    "DELETE_ITEM requires a non-empty key object"
                );
            }
        }
    }

    // --------------------------------------------------
    // 22. EC2-specific validation
    // --------------------------------------------------

    if (resourceType === "EC2") {

        // --------------------------------------------------
        // START_INSTANCE
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            EC2_FIX_ACTIONS.START_INSTANCE
        ) {
            if (
                currentEc2Config?.state &&
                currentEc2Config.state !== "stopped"
            ) {
                throw new Error(
                    `START_INSTANCE requires a stopped instance. Current state: ${currentEc2Config.state}`
                );
            }

            if (
                event.eventType === "EC2_STATE_CHANGE" &&
                event.ec2State !== "stopped"
            ) {
                throw new Error(
                    `START_INSTANCE requires ec2State=stopped. Received: ${event.ec2State}`
                );
            }
        }

        // --------------------------------------------------
        // REBOOT_INSTANCE
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            EC2_FIX_ACTIONS.REBOOT_INSTANCE
        ) {
            if (
                event.eventType === "EC2_STATE_CHANGE"
            ) {
                throw new Error(
                    "REBOOT_INSTANCE is not allowed for EC2_STATE_CHANGE incidents"
                );
            }

            if (
                currentEc2Config?.state &&
                currentEc2Config.state !== "running"
            ) {
                throw new Error(
                    `REBOOT_INSTANCE requires a running instance. Current state: ${currentEc2Config.state}`
                );
            }
        }

        // --------------------------------------------------
        // STOP_INSTANCE
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            EC2_FIX_ACTIONS.STOP_INSTANCE
        ) {
            const validStates = [
                "running",
                "pending",
                "stopping"
            ];

            if (
                currentEc2Config?.state &&
                !validStates.includes(
                    currentEc2Config.state
                )
            ) {
                throw new Error(
                    `STOP_INSTANCE cannot be recommended for instance state: ${currentEc2Config.state}`
                );
            }

            if (
                event.eventType === "EC2_STATE_CHANGE" &&
                event.ec2State !== "running"
            ) {
                throw new Error(
                    `STOP_INSTANCE requires ec2State=running. Received: ${event.ec2State}`
                );
            }
        }

        // --------------------------------------------------
        // EC2 STATE CHANGE ACTION VALIDATION
        // --------------------------------------------------

        if (
            event.eventType === "EC2_STATE_CHANGE"
        ) {
            if (
                event.ec2State === "stopped" &&
                diagnosis.fix.action !==
                    EC2_FIX_ACTIONS.START_INSTANCE
            ) {
                throw new Error(
                    `EC2_STATE_CHANGE with ec2State=stopped MUST use START_INSTANCE. Received: ${diagnosis.fix.action}`
                );
            }

            if (
                event.ec2State === "running" &&
                diagnosis.fix.action !==
                    EC2_FIX_ACTIONS.STOP_INSTANCE
            ) {
                throw new Error(
                    `EC2_STATE_CHANGE with ec2State=running MUST use STOP_INSTANCE. Received: ${diagnosis.fix.action}`
                );
            }

            if (
                event.ec2State !== "stopped" &&
                event.ec2State !== "running"
            ) {
                throw new Error(
                    `Unsupported EC2 state for EC2_STATE_CHANGE: ${event.ec2State}`
                );
            }
        }

        // --------------------------------------------------
        // RESIZE_INSTANCE
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            EC2_FIX_ACTIONS.RESIZE_INSTANCE
        ) {
            const targetInstanceType =
                diagnosis.fix.parameters
                    .targetInstanceType;

            if (
                typeof targetInstanceType !== "string" ||
                !targetInstanceType.trim()
            ) {
                throw new Error(
                    "RESIZE_INSTANCE requires targetInstanceType"
                );
            }

            if (
                currentEc2Config?.instanceType &&
                targetInstanceType ===
                    currentEc2Config.instanceType
            ) {
                throw new Error(
                    `RESIZE_INSTANCE targetInstanceType must be different from current instance type: ${currentEc2Config.instanceType}`
                );
            }

            /*
                Basic EC2 instance type format validation.

                Examples:

                t3.micro
                t3.small
                t3.medium
                m7i-flex.large
            */

            const validInstanceType =
                /^[a-z0-9][a-z0-9.-]*\.[a-z0-9]+$/i
                    .test(targetInstanceType);

            if (!validInstanceType) {
                throw new Error(
                    `Invalid EC2 instance type: ${targetInstanceType}`
                );
            }
        }

        // --------------------------------------------------
        // RESTART_WITH_ROLLBACK_AMI
        // --------------------------------------------------

        if (
            diagnosis.fix.action ===
            EC2_FIX_ACTIONS.RESTART_WITH_ROLLBACK_AMI
        ) {
            const targetAmiId =
                diagnosis.fix.parameters
                    .targetAmiId;

            if (
                typeof targetAmiId !== "string" ||
                !/^ami-[a-f0-9]{8,17}$/i
                    .test(targetAmiId)
            ) {
                throw new Error(
                    `Invalid targetAmiId: ${targetAmiId}. Must be a valid AMI ID.`
                );
            }

            /*
                Very important safety rule:

                The LLM must not invent an AMI.

                Since we only provide the current AMI
                above, rollback is allowed only if
                incident evidence explicitly provides
                another known-good AMI.
            */

            const incidentText =
                JSON.stringify(event);

            if (
                !incidentText.includes(
                    targetAmiId
                )
            ) {
                throw new Error(
                    `RESTART_WITH_ROLLBACK_AMI rejected because target AMI ${targetAmiId} was not present in the incident evidence`
                );
            }

            if (
                currentEc2Config?.imageId &&
                targetAmiId ===
                    currentEc2Config.imageId
            ) {
                throw new Error(
                    `RESTART_WITH_ROLLBACK_AMI target AMI must differ from current AMI: ${currentEc2Config.imageId}`
                );
            }
        }
    }

    // --------------------------------------------------
    // 23. Construct final output
    // --------------------------------------------------

    return {

        // --------------------------------------------------
        // Trusted fields from incoming event
        // --------------------------------------------------

        incidentId:
            event.incidentId,

        resourceType,

        resourceArn,

        metric:
            event.metric,

        value:
            event.value,

        threshold:
            event.threshold,

        eventTime:
            event.eventTime,

        alarmName:
            event.alarmName,

        alarmState:
            event.alarmState,

        alarmReason:
            event.alarmReason,

        source:
            event.source,

        account:
            event.account,

        region:
            event.region,

        eventType:
            event.eventType || null,

        ec2State:
            event.ec2State || null,

        // --------------------------------------------------
        // Current resource configurations
        // --------------------------------------------------

        currentLambdaConfig,

        currentTableConfig,

        currentEc2Config,

        // --------------------------------------------------
        // AI diagnosis
        // --------------------------------------------------

        rootCause:
            diagnosis.rootCause,

        severity:
            diagnosis.severity,

        reason:
            diagnosis.reason,

        confidence:
            diagnosis.confidence,

        confidenceReason:
            diagnosis.confidenceReason,

        blastRadius:
            diagnosis.blastRadius,

        blastRadiusReason:
            diagnosis.blastRadiusReason,

        estimatedCostImpact:
            diagnosis.estimatedCostImpact,

        // --------------------------------------------------
        // Strictly validated resource-specific fix
        // --------------------------------------------------

        fix: {
            action:
                diagnosis.fix.action,

            parameters: {
                ...diagnosis.fix.parameters
            }
        },

        // --------------------------------------------------
        // Approval is NOT generated by the LLM
        // --------------------------------------------------

        approval: {
            approved: false,
            approvedBy: null,
            approvedAt: null
        }
    };
};