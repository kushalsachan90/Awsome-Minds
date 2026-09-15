# Cognito JWT Lambda Authorizer

Prefer API Gateway's native HTTP API JWT authorizer. Deploy this fallback only when native JWT authorization cannot be used. Configure `AUTH_COGNITO_USER_POOL_ID` and `AUTH_COGNITO_CLIENT_ID`; no secret value is needed.
