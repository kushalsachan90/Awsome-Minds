# Self-Healing Infrastructure - Azizul's Deliverable

This package contains the production-ready frontend approval dashboard and the authorization/approval API functions owned by Azizul. It has no AWS credentials, tokens, private `.env` files, or Step Functions task tokens.

## What is included

- Cognito Hosted UI sign-in using OAuth 2.0 Authorization Code + PKCE. No client secret is used in the browser.
- Incident dashboard with approval, rejection reason, searchable incidents, confidence, blast-radius, cost-impact, and outcome display.
- Optional incident-chat panel for the team's `/ask` API.
- Cognito JWT Lambda authorizer, for teams that cannot use the recommended native API Gateway JWT authorizer.
- Approval API for API Gateway HTTP API: paginated incident list, details, approve, reject, CORS, audit identity, and concurrency protection.
- Integration contract and deployment handoff for the infrastructure team.

## Local frontend run

```bash
cd frontend/azizul
npm install
copy .env.example .env
npm run dev
```

Set the public values in `.env`. `VITE_*` values are visible in the browser: never put an AWS key, secret, password, API token, or Cognito client secret there.

## Integration ownership

The infrastructure teammate deploys and configures API Gateway, Cognito, Lambda IAM roles, DynamoDB, Step Functions, Amplify Hosting, and Lambda environment variables. Follow [docs/DEPLOYMENT_HANDOFF.md](docs/DEPLOYMENT_HANDOFF.md) exactly. Do not change teammates' business logic.

## Recommended authorization

Use an **API Gateway HTTP API JWT authorizer** with Cognito. The included `api-authorizer` Lambda is a fallback only; native JWT validation is cheaper and removes a Lambda hop.
