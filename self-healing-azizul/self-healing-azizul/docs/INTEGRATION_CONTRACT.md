# Frontend and Approval API Contract

## HTTP API routes

All routes require an API Gateway Cognito JWT authorizer except `OPTIONS`.

| Route | Request | Success response |
|---|---|---|
| `GET /incidents?limit=20&cursor=...` | none | `{ incidents, nextCursor }` |
| `GET /incidents/{incidentId}` | none | `{ incident }` |
| `POST /incidents/{incidentId}/approve` | `{}` | `{ incidentId, status, approvedBy, approvedAt }` |
| `POST /incidents/{incidentId}/reject` | `{ reason: "..." }` | `{ incidentId, status, rejectedBy, rejectedAt, rejectionReason }` |
| `POST /ask` | `{ question: "..." }` | `{ answer: "..." }` - owned by the chat teammate |

## Required DynamoDB item fields

`incidentId` is the partition key. The orchestration workflow must create an incident with `status: "AWAITING_APPROVAL"` and `approvalTaskToken` before the dashboard can approve or reject it.

```json
{
  "incidentId": "INC-2026-001",
  "resourceType": "EC2",
  "resourceId": "i-0123456789abcdef0",
  "metric": "CPUUtilization",
  "metricValue": 96,
  "threshold": 80,
  "severity": "HIGH",
  "rootCause": "Sustained CPU saturation",
  "reason": "CPU exceeded the threshold for five minutes.",
  "recommendedAction": "Restart the instance.",
  "confidence": 88,
  "confidenceReason": "Metric pattern matches prior saturation incidents.",
  "blastRadius": "MEDIUM",
  "blastRadiusReason": "A restart briefly affects this instance only.",
  "estimatedCostImpact": "+$0/month",
  "status": "AWAITING_APPROVAL",
  "approvalTaskToken": "SERVER-SIDE-ONLY",
  "diagnosedAt": "2026-09-15T10:00:00.000Z"
}
```

The API never returns `approvalTaskToken` to the browser. Diagnosis may use camelCase or snake_case for the three optional AI fields; the frontend supports both during integration.

## Status transitions

`AWAITING_APPROVAL` -> `APPROVAL_IN_PROGRESS` -> `APPROVED` or `REJECTED`.

Only Step Functions or the apply-fix Lambda may subsequently write remediation outcomes such as `REMEDIATING`, `FIXED`, or `FIX_FAILED`. A rejection must persist `rejectionReason`, enabling the learning loop.
