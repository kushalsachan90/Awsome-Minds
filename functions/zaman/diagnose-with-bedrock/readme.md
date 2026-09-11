# Zaman — Diagnose With Bedrock Lambda

## 1. Your Responsibility

You are responsible for:

```text
functions/zaman/diagnose-with-bedrock/
```

Your job is to build a Lambda function that:

1. Receives an infrastructure incident.
2. Sends the incident information to Amazon Bedrock.
3. Uses Bedrock to analyze the incident.
4. Identifies the likely root cause.
5. Determines the severity.
6. Suggests a recommended action.
7. Returns the result as structured JSON.

### Important

Your Lambda is responsible for **DIAGNOSIS ONLY**.

You are NOT responsible for applying the infrastructure fix.

---

# 2. Current Folder

Your folder is:

```text
functions/
└── zaman/
    └── diagnose-with-bedrock/
        ├── index.js
        ├── package.json
        ├── package-lock.json
        └── README.md
```

The Lambda entry point is:

```text
index.handler
```

This means:

```text
index.js
   ↓
handler(event)
```

---

# 3. Overall Project Flow

The complete project will work approximately like this:

```text
CloudWatch
    ↓
Metric crosses threshold
    ↓
EventBridge
    ↓
Step Functions
    ↓
Zaman's Diagnose Lambda
    ↓
Amazon Bedrock
    ↓
Diagnosis
    ↓
Step Functions
    ↓
Human Approval
    ↓
Jyotish's Apply-Fix Lambda
```

Your part is:

```text
Incident
   ↓
Your Lambda
   ↓
Amazon Bedrock
   ↓
Diagnosis
   ↓
Structured JSON
```

---

# 4. Input

Your Lambda will receive an incident event.

Example:

```json
{
  "incidentId": "INC-001",
  "metric": "CPUUtilization",
  "value": 95,
  "threshold": 80
}
```

## Input fields

| Field | Meaning |
|---|---|
| `incidentId` | Unique ID of the incident |
| `metric` | CloudWatch metric that breached |
| `value` | Current metric value |
| `threshold` | Configured threshold |

Additional fields may be added later by Step Functions.

Do not unnecessarily reject additional fields.

---

# 5. What Your Lambda Should Do

The Lambda should follow this flow:

```text
Receive event
     ↓
Validate required fields
     ↓
Prepare Bedrock prompt
     ↓
Call Amazon Bedrock
     ↓
Read Bedrock response
     ↓
Convert response into structured JSON
     ↓
Return diagnosis
```

---

# 6. Bedrock Diagnosis

Bedrock should analyze the incident and provide information such as:

### Root Cause

What is probably causing the incident?

Example:

```text
High CPU utilization caused by a CPU-intensive workload.
```

### Severity

For example:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### Reason

Explain why Bedrock reached that conclusion.

### Recommended Action

Suggest what should be done to resolve the issue.

---

# 7. Expected Output

The output should be machine-readable JSON.

Example:

```json
{
  "incidentId": "INC-001",
  "diagnosis": {
    "rootCause": "High CPU utilization",
    "severity": "HIGH",
    "reason": "CPU utilization is significantly above the configured threshold.",
    "recommendedAction": "Investigate CPU-intensive processes and consider increasing compute capacity."
  }
}
```

The exact wording can be improved.

However, keep the output structure predictable because **Step Functions will consume this output later**.

---

# 8. Do NOT Apply the Fix

This is very important.

Your Lambda must NOT actually modify infrastructure.

Do NOT:

- restart EC2 instances
- terminate EC2 instances
- modify Auto Scaling
- modify security groups
- modify networking
- change infrastructure
- call Jyotish's `apply-fix` Lambda

Your responsibility ends at:

```text
Diagnosis + Recommended Action
```

The actual fix will be handled by Jyotish.

---

# 9. AWS SDK

The project already uses the AWS Bedrock Runtime SDK.

Package:

```bash
npm install @aws-sdk/client-bedrock-runtime
```

Use the AWS SDK for JavaScript to communicate with Amazon Bedrock.

Do not introduce another AI provider unless discussed with the team.

---

# 10. Model ID

Do not hardcode the model ID everywhere.

Prefer an environment variable:

```text
BEDROCK_MODEL_ID
```

For example, the code should be designed so that the model can be changed through configuration rather than changing multiple places in the source code.

The final Bedrock model will be decided based on the model available to our AWS account and hackathon requirements.

---

# 11. IAM Permissions

The Lambda will need permission to invoke the selected Bedrock model.

Do NOT put AWS credentials inside the source code.

Never commit:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

or any other credentials.

The required Bedrock permission will eventually be configured through the Lambda execution role.

If you need a specific IAM permission, tell Kushal.

---

# 12. Error Handling

Your Lambda should handle errors properly.

## Invalid Input

For example:

```json
{}
```

If required fields are missing, return/throw a meaningful error.

Required fields currently include:

```text
incidentId
metric
value
threshold
```

## Bedrock Errors

Handle situations such as:

- Bedrock API failure
- throttling
- timeout
- invalid model ID
- invalid model configuration
- malformed Bedrock response

Do not silently ignore errors.

---

# 13. Local Test Event

A test event already exists:

```text
events/zaman-test.json
```

Current test data:

```json
{
  "incidentId": "INC-001",
  "metric": "CPUUtilization",
  "value": 95,
  "threshold": 80
}
```

This is only a test input.

It is NOT a Lambda.

The Lambda is:

```text
DiagnoseWithBedrockFunction
```

The JSON file is simply the event passed to the Lambda during testing.

---

# 14. Local Testing

From the project root:

```powershell
sam build
```

Then:

```powershell
sam local invoke DiagnoseWithBedrockFunction -e events\zaman-test.json
```

The basic Lambda wiring has already been tested successfully.

The next goal is to replace the basic test response with the real Bedrock diagnosis.

---

# 15. Files You Should Modify

Your main work should stay inside:

```text
functions/zaman/diagnose-with-bedrock/
```

You can modify:

```text
index.js
package.json
```

You can create helper files if needed.

For example:

```text
bedrock.js
prompt.js
utils.js
```

if they make the code cleaner.

Do NOT modify other team members' folders.

---

# 16. Do Not Modify Other Team Members' Work

Do not modify these folders without discussion:

```text
functions/jyotish/
functions/azizul/
functions/kushal/
```

Kushal is responsible for the main orchestration.

---

# 17. Integration With Kushal

Kushal is responsible for:

```text
EventBridge
     ↓
Step Functions
     ↓
DynamoDB
     ↓
Overall orchestration
```

Your Lambda will eventually be called by Step Functions.

Therefore, your input and output format must remain predictable.

If you want to change the input/output contract, discuss it with Kushal first.

---

# 18. What You Need To Tell Kushal

After your implementation is ready, provide:

### Input

Example:

```json
{
  "incidentId": "INC-001",
  "metric": "CPUUtilization",
  "value": 95,
  "threshold": 80
}
```

### Output

Example:

```json
{
  "incidentId": "INC-001",
  "diagnosis": {
    "rootCause": "...",
    "severity": "HIGH",
    "reason": "...",
    "recommendedAction": "..."
  }
}
```

Also tell Kushal:

- Bedrock model ID
- Environment variables required
- IAM permissions required
- Any additional input fields required
- Final output format

---

# 19. Definition of Done

Your task is complete when:

- [ ] Lambda receives incident data.
- [ ] Required input fields are validated.
- [ ] Lambda creates a Bedrock prompt.
- [ ] Lambda successfully calls Amazon Bedrock.
- [ ] Bedrock response is parsed.
- [ ] Root cause is returned.
- [ ] Severity is returned.
- [ ] Reason is returned.
- [ ] Recommended action is returned.
- [ ] Output is structured JSON.
- [ ] Bedrock errors are handled.
- [ ] No AWS credentials are hardcoded.
- [ ] Model ID is configurable.
- [ ] Local testing works where applicable.
- [ ] Code is committed to your branch.
- [ ] Final input/output contract is shared with Kushal.

---

# 20. Final Responsibility

Your complete responsibility is:

```text
                 INCIDENT
                    ↓
          ┌──────────────────┐
          │  Zaman Lambda    │
          └────────┬─────────┘
                   ↓
             Amazon Bedrock
                   ↓
          ┌──────────────────┐
          │    Diagnosis     │
          │                  │
          │ Root Cause       │
          │ Severity         │
          │ Reason           │
          │ Recommended Fix  │
          └────────┬─────────┘
                   ↓
             Step Functions
```

You are NOT responsible for:

```text
EventBridge
Step Functions orchestration
DynamoDB orchestration
Human approval
Applying infrastructure fixes
Frontend/dashboard
```

Those are handled by other team members.

---

# Important

Do not just make the Lambda return a hardcoded diagnosis.

The final implementation must actually use **Amazon Bedrock** to analyze the incident.

The goal is:

```text
REAL INCIDENT DATA
       ↓
AMAZON BEDROCK
       ↓
AI-BASED DIAGNOSIS
       ↓
STRUCTURED RESULT
```