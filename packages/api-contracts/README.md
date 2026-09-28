# @marketforge/api-contracts

Shared OpenAPI specifications and generated clients.

Plan (Phase 1-2):

- `commerce-go.openapi.yaml` — generated from the Go service (swaggo)
- `order-service.openapi.yaml` — springdoc output
- `notification-service.openapi.json` — Swashbuckle output
- `ai-service.openapi.json` — FastAPI `/openapi.json`

Frontend and gateway types are generated from these specs so contract drift is
caught at build time.
