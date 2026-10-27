# MarketForge

Multi-service e-commerce / marketplace platform built as a production-oriented learning & portfolio project.

> The full requirements live in [`Multi-Service-E-Commerce-Marketplace-Requirements.md`](./Multi-Service-E-Commerce-Marketplace-Requirements.md).

## Project Overview

MarketForge is a marketplace where customers register, browse products, manage a cart, check out, pay through a sandbox payment gateway, and receive notifications. Admins manage catalog, inventory, orders, and operations. An AI assistant answers product/order questions via tool calling + RAG.

The platform deliberately uses **multiple backend technologies** so each service demonstrates a different ecosystem solving the same class of problems.

## Services

| Service | Stack | Responsibility |
|---|---|---|
| `apps/commerce-go` | Go + PostgreSQL + Redis | Product catalog, categories, inventory, cart (core commerce) |
| `apps/order-service` | Java + Spring Boot + PostgreSQL | Orders, order items, order state machine, checkout orchestration |
| `apps/notification-service` | C# + ASP.NET Core + PostgreSQL | Notifications (email), templates, delivery history, retries |
| `apps/ai-service` | Python + FastAPI | AI assistant, tool calling, RAG, guardrails |
| `apps/gateway` | Node/TypeScript (NestJS) | Auth, request IDs, routing, rate limiting, error envelope |
| `apps/web` | Next.js | Customer storefront + admin dashboard |

## Quickstart

```bash
# 1. Clone
git clone <repo-url> marketforge && cd marketforge

# 2. Configure environment
cp .env.example .env

# 3. Start the stack
docker compose up -d

# 4. Run database migrations & seed
make migrate
make seed

# 5. Open
# Web:      http://localhost:3000
# Gateway:  http://localhost:8080
# RabbitMQ: http://localhost:15672 (guest/guest)
# Grafana:  http://localhost:3001 (admin/admin)
```

Local development without Docker for a single service:

```bash
cd apps/commerce-go
cp ../../.env.example ../../.env  # shared env at root
make dev-go                        # runs with air hot-reload
```

## Repository Structure

```text
marketforge/
├── apps/                    # Deployable services
│   ├── web/                 # Next.js frontend
│   ├── gateway/             # API Gateway / BFF
│   ├── commerce-go/         # Go: catalog, inventory, cart
│   ├── order-service/       # Spring Boot: orders
│   ├── notification-service/# ASP.NET Core: notifications
│   └── ai-service/          # FastAPI: AI assistant
├── packages/                # Shared contracts & config
│   ├── api-contracts/       # OpenAPI specs
│   ├── types/               # Shared TS types
│   └── config/              # Shared lint/tsconfig
├── infrastructure/          # Docker, nginx, prometheus, grafana, rabbitmq
├── docs/                    # architecture, api, database, security, operations, decisions, learning
├── scripts/                 # Migration & seed helpers
├── .github/workflows/       # CI/CD
├── docker-compose.yml
└── .env.example
```

## Development Phases

The project is built incrementally (see requirements §84):

- [x] **Phase 0** — Foundation: repo, compose, Postgres, docs
- [x] **Phase 1** — Go commerce service (product/category/inventory/cart CRUD, checkout reservation)
- **Phase 2 — In progress:** responsive catalog, search, product detail, and browser-persisted cart. Login, admin editing, and server checkout still depend on the auth/API flow.
- **Phase 3 — Implemented, stack validation pending:** Redis catalog cache with version invalidation and Redis-backed API rate limiting.
- **Phase 4 — Implemented, integration validation pending:** Spring order creation uses Commerce quotes for authoritative product prices and an order UUID for reservation correlation.
- **Phase 5 — Implemented, database concurrency test pending:** idempotent sorted reservations, atomic stock updates, and confirm/release transitions.
- **Phase 6 — Implemented as local sandbox:** mock payment sessions, payment persistence, expiration, and inventory/order state transitions. This is not a real gateway or webhook.
- [ ] **Phase 7** — Webhook + idempotency
- [ ] **Phase 8** — RabbitMQ events
- [ ] **Phase 9** — .NET notification service
- [ ] **Phase 10-17** — Integrations, security, testing, observability, CI/CD, search, AI, deployment

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design & service boundaries
- [API.md](./API.md) — API conventions & index
- [DATABASE.md](./DATABASE.md) — schema & indexing strategy
- [SECURITY.md](./SECURITY.md) — threat model & controls
- [OBSERVABILITY.md](./OBSERVABILITY.md) — logging, metrics, tracing
- [DEPLOYMENT.md](./DEPLOYMENT.md) — environments & deployment
- [DECISIONS.md](./DECISIONS.md) — architecture decision records
- [LEARNING.md](./LEARNING.md) — personal learning tracker
- [docs/](./docs/) — detailed topic docs

## Conventions

- Commits follow Conventional Commits: `feat(product): add product creation API`
- Branches: `main`, `develop`, `feature/*`, `fix/*`
- API versioning: `/api/v1`
- Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "requestId": "req_123"
  }
}
```
