# Approval API

Implements the API contract in `../../../../docs/INTEGRATION_CONTRACT.md`. This Lambda receives authenticated identity from API Gateway, never from the browser request body. Configure only `INCIDENT_TABLE` and `ALLOW_ORIGIN` at deploy time.
