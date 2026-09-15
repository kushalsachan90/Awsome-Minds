# Infrastructure Handoff - Required Configuration

## Do not provide these to frontend developers

- AWS access key IDs or secret access keys
- Cognito client secret (create a public SPA client with no secret)
- SSM parameter values, API tokens, or Step Functions task tokens
- private `.env` files

## Cognito and Amplify

1. Create a Cognito User Pool and a **public SPA app client without a client secret**.
2. Enable Cognito Hosted UI, Authorization Code grant, scopes `openid email profile`, and callback/logout URLs for the Amplify domain and local `http://localhost:5173/`.
3. In Amplify, add the public `VITE_*` variables from the frontend `.env.example`.
4. Add the Amplify production URL to the approval Lambda `ALLOW_ORIGIN` environment variable.

## API Gateway

1. Create an HTTP API with the routes in `INTEGRATION_CONTRACT.md`.
2. Use a native JWT authorizer: issuer `https://cognito-idp.<region>.amazonaws.com/<userPoolId>` and audience `<clientId>`.
3. Attach the authorizer to every business route. `OPTIONS` must remain unauthenticated for CORS.
4. Set `VITE_API_URL` to the deployed stage base URL, without a trailing slash.

## Approval Lambda environment and IAM

Environment variables:

```text
INCIDENT_TABLE=<DynamoDB table name>
ALLOW_ORIGIN=https://main.<amplify-app-id>.amplifyapp.com
```

Least-privilege IAM permissions:

- `dynamodb:GetItem`, `dynamodb:Scan`, `dynamodb:UpdateItem` on the incident table.
- `states:SendTaskSuccess`, `states:SendTaskFailure` for approval callback task tokens.
- CloudWatch Logs write permissions.

The workflow must use a callback task (`.waitForTaskToken`) and persist `approvalTaskToken` server-side with `AWAITING_APPROVAL`.

## Optional Lambda authorizer fallback

Only deploy `api-authorizer` if native HTTP API JWT authorization is unavailable. Set `AUTH_COGNITO_USER_POOL_ID` and `AUTH_COGNITO_CLIENT_ID`; give it CloudWatch Logs permissions only. It does not require AWS secrets.
