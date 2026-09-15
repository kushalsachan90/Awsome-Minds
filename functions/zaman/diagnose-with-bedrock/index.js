import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL:
        process.env.OPENAI_BASE_URL ||
        "https://bedrock-mantle.ap-south-1.api.aws/v1"
});

const MODEL_ID = "openai.gpt-oss-safeguard-20b";

// --------------------------------------------------
// Allowed Lambda fix actions
// --------------------------------------------------

const FIX_ACTIONS = Object.freeze({
    ROLLBACK_VERSION: "ROLLBACK_VERSION",
    INCREASE_MEMORY: "INCREASE_MEMORY",
    DISABLE_FUNCTION: "DISABLE_FUNCTION"
});

const VALID_FIX_ACTIONS = Object.values(FIX_ACTIONS);

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
                : "Unknown"
        );

    // --------------------------------------------------
    // 4. Prepare Bedrock prompt
    // --------------------------------------------------

    const prompt = `
You are an infrastructure incident diagnosis assistant.

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

The fix action MUST be exactly ONE of:

ROLLBACK_VERSION
INCREASE_MEMORY
DISABLE_FUNCTION

NEVER invent another fix action.

For a Lambda incident:

ROLLBACK_VERSION:
Use when a recent deployment/version is the likely cause.

INCREASE_MEMORY:
Use when the function is experiencing resource/CPU pressure and increasing memory is an appropriate mitigation.

DISABLE_FUNCTION:
Use when disabling the function is the safest available mitigation.

If the evidence is insufficient for a specific fix, choose the safest applicable action from the allowed list.

Keep all text concise.

Return ONLY valid JSON.

Do not use markdown.
Do not use code fences.
Do not include explanation outside the JSON.
Do not include your reasoning process.

Return exactly this structure:

{
  "rootCause": "short root cause",
  "severity": "HIGH",
  "reason": "short explanation",
  "confidence": 96,
  "confidenceReason": "short reason for confidence",
  "blastRadius": "short blast radius",
  "blastRadiusReason": "short reason",
  "estimatedCostImpact": "Low",
  "fix": {
    "action": "INCREASE_MEMORY",
    "parameters": {
      "targetVersion": "$LATEST_STABLE",
      "reason": "short reason for selected fix"
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
    // 5. Call Bedrock
    // --------------------------------------------------

    let response;

    try {
        response = await client.chat.completions.create({
            model: MODEL_ID,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
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
    // 6. Extract response
    // --------------------------------------------------

    const choice = response?.choices?.[0];

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
    // 7. Parse JSON
    // --------------------------------------------------

    let diagnosis;

    try {
        diagnosis = JSON.parse(
            responseText.trim()
        );
    } catch (error) {
        console.error(
            "Malformed JSON returned by Bedrock"
        );

        throw new Error(
            "Bedrock returned malformed JSON"
        );
    }

    // --------------------------------------------------
    // 8. Validate diagnosis fields
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
    // 9. Validate severity
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
    // 10. Validate confidence
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
    // 11. Validate cost impact
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
    // 12. Validate fix object
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
    // 13. STRICTLY validate fix action
    // --------------------------------------------------

    if (
        !VALID_FIX_ACTIONS.includes(
            diagnosis.fix.action
        )
    ) {
        throw new Error(
            `Invalid fix action returned by Bedrock: ${diagnosis.fix.action}`
        );
    }

    // --------------------------------------------------
    // 14. Validate fix parameters
    // --------------------------------------------------

    if (
        typeof diagnosis.fix.parameters !== "object" ||
        diagnosis.fix.parameters === null
    ) {
        throw new Error(
            "Bedrock returned invalid fix parameters"
        );
    }

    if (
        !diagnosis.fix.parameters.reason ||
        typeof diagnosis.fix.parameters.reason !== "string"
    ) {
        throw new Error(
            "Fix parameters must contain a valid reason"
        );
    }

    // --------------------------------------------------
    // 15. Construct final output
    // --------------------------------------------------

    return {
    // Trusted fields from incoming event
    incidentId: event.incidentId,

    resourceType,

    resourceArn,

    metric: event.metric,

    value: event.value,

    threshold: event.threshold,

    eventTime: event.eventTime,

    alarmName: event.alarmName,

    alarmState: event.alarmState,

    alarmReason: event.alarmReason,

    source: event.source,

    account: event.account,

    region: event.region,

    // AI diagnosis
    rootCause: diagnosis.rootCause,

    severity: diagnosis.severity,

    reason: diagnosis.reason,

    confidence: diagnosis.confidence,

    confidenceReason:
        diagnosis.confidenceReason,

    blastRadius:
        diagnosis.blastRadius,

    blastRadiusReason:
        diagnosis.blastRadiusReason,

    estimatedCostImpact:
        diagnosis.estimatedCostImpact,

    // Strictly validated fix
    fix: {
        action: diagnosis.fix.action,

        parameters: {
            ...diagnosis.fix.parameters
        }
    },

    // Approval is NOT generated by the LLM.
    // It should be populated by the approval workflow.
    approval: {
        approved: false,
        approvedBy: null,
        approvedAt: null
    }
};
};