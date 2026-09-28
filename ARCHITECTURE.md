# MarketForge — Architecture

## High-Level Architecture

```text
                         ┌───────────────────┐
                         │     Next.js       │
                         │      Web App      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    API Gateway    │
                         │ / BFF / Gateway   │
                         └─────────┬─────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
      ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
      │    Go       │       │ Spring Boot │       │ ASP.NET     │
      │  Commerce   │       │   Orders    │       │Notification │
      └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  ▼                ▼                ▼
             PostgreSQL         Redis           RabbitMQ
                  │                │                │
                  ▼                │                ▼
              Storage              │          Async Workers
                                   │
                                   ▼
                            External Services
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
                Payment         Email         Object Storage
                Gateway          API
```

## AI Subsystem

```text
   Next.js
      │
      ▼
 AI Assistant UI
      │
      ▼
 FastAPI AI Service
      │
   ┌──┴─────────┐
   ▼            ▼
  LLM      Tool Calling
                │
                ├── Product Search   → Go API
                ├── Order Lookup     → Order API
                ├── Inventory Check  → Go API
                └── Support Ticket   → Notification API
```

The AI never touches the database directly. Every sensitive read goes through
a tool → internal API → authorization check.

## Service Boundaries & Data Ownership

| Service | Owns (tables) | Database |
|---|---|---|
| commerce-go | `users`, `addresses`, `categories`, `products`, `product_images`, `inventory`, `reservations`, `carts`, `cart_items` | PostgreSQL (schema `commerce`) |
| order-service | `orders`, `order_items`, `order_history` | PostgreSQL (schema `orders`) |
| order-service (payment) | `payments`, `webhook_events`, `idempotency_keys` | PostgreSQL (schema `payments`) |
| notification-service | `notifications`, `templates`, `delivery_attempts` | PostgreSQL (schema `notifications`) |
| ai-service | `conversations`, `messages`, `documents`, `embeddings` (pgvector) | PostgreSQL (schema `ai`) |

Rules:

- **No cross-service table access.** Order Service reads products through the Go API or via events, never directly from `commerce` tables.
- A **shared PostgreSQL instance with separate schemas** is acceptable for the learning phase; migrating to separate databases later requires no code change outside connection config.

## Communication

| Interaction | Mechanism | Why |
|---|---|---|
| Web → Gateway → Services | REST/HTTP | Needs an immediate answer |
| Checkout: order creation | REST (order-service) + sync reserve (Go API) | Must know success before returning |
| Order paid → notifications | RabbitMQ event `OrderPaid` | Can happen asynchronously |
| Product updated → search index | RabbitMQ event `ProductUpdated` | Eventual consistency is fine |
| Payment result → order status | Webhook (provider → order-service) | Provider-initiated, needs idempotency |

## Order State Machine

```text
PENDING_PAYMENT ──► PAID ──► PROCESSING ──► SHIPPED ──► DELIVERED
       │              │
       │              └──► CANCELLED
       └──► EXPIRED
```

- Transitions are validated server-side; illegal transitions are rejected.
- Every transition writes an `order_history` row with actor (`CUSTOMER | ADMIN | SYSTEM | WEBHOOK`).

## Checkout Flow (transactional core)

```text
BEGIN (order-service)
  1. load & validate cart items (via Go API, product status + price)
  2. reserve inventory (Go API, row-locked UPDATE, reservation expires_at)
  3. create order (PENDING_PAYMENT) + order items (snapshot name/price/sku)
  4. create payment record + call provider
COMMIT
```

- Prices are always recalculated server-side. Frontend totals are advisory only.
- Failure → ROLLBACK → release reservation → return typed error envelope.

## Consistency Model

- **Strong consistency (DB transactions):** inventory reservation, order + items creation, payment status transitions.
- **Eventual consistency (events):** notifications, search indexing, analytics, cache invalidation.
- Consumers must be **idempotent**; duplicate delivery is expected and safe.

## Reliability Patterns

| Pattern | Where |
|---|---|
| Idempotency keys | `POST /orders`, payment creation, webhook processing |
| Retry + exponential backoff | Email provider calls, payment API calls |
| Dead-letter queue | All RabbitMQ consumers after N failed attempts |
| Scheduled jobs | Expired payment cleanup, expired reservation release, notification retry |
| Outbox pattern | Phase: after base events work (optional advanced) |

## Deployment Topology

Development: single host, `docker compose up` (see `docker-compose.yml`).
Production target: container hosting for services, managed PostgreSQL/Redis, S3-compatible storage — see [DEPLOYMENT.md](./DEPLOYMENT.md).
