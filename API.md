# MarketForge — API Conventions

All services follow these conventions so the gateway and frontend can treat the
system uniformly.

## Versioning

All public endpoints are versioned: `/api/v1/...`

Breaking changes → new version prefix (`/api/v2`), old version deprecated with a
sunset header before removal.

## Error Envelope

Every error response uses one shape:

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "requestId": "req_01J9Z0K4M2"
  }
}
```

- `code` — stable, machine-readable, `SCREAMING_SNAKE_CASE`
- `message` — human-readable, safe to display (never stack traces)
- `requestId` — correlation ID from `X-Request-Id`, echoed in logs

### Standard error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/query failed validation |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Authenticated but lacking permission |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Unique violation / invalid state transition |
| `IDEMPOTENCY_REPLAY` | 409 | Same key with different payload |
| `INSUFFICIENT_INVENTORY` | 409 | Reservation failed |
| `PAYMENT_REQUIRED` | 402 | Payment failed/expired |
| `UNPROCESSABLE` | 422 | Semantically invalid (e.g. illegal state transition) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency down (db/redis/broker) |

## Success Envelope (collections)

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

## Pagination

- Offset (initial): `?page=1&limit=20`, `limit` capped at 100
- Cursor (advanced): `?cursor=base64key&limit=20` — stable under concurrent inserts

## Idempotency

Write endpoints that must not double-apply accept:

```
Idempotency-Key: <uuid>
```

First request executes and caches the result; a replay returns the cached
response with `Idempotent-Replay: true`. Same key + different body → `409`.

Applied to: `POST /orders`, `POST /payments`, `POST /webhooks/payment`.

## Validation

All input validated at the boundary:

- IDs: UUID v4
- Email: normalized (lowercase, trimmed) + RFC format
- Money: integer minor units or decimal string — never floats on the wire
- Quantity: integer ≥ 1
- Enums: validated against the closed set

## Authentication

```
Authorization: Bearer <access-token>
```

Access token: JWT, short-lived (15 min). Refresh via `POST /api/v1/auth/refresh`
with the refresh token (httpOnly cookie or body).

## Service Index

| Service | Base URL (docker) | Docs |
|---|---|---|
| gateway | http://localhost:8080 | http://localhost:8080/docs |
| commerce-go | http://localhost:8081 | http://localhost:8081/swagger/index.html |
| order-service | http://localhost:8082 | http://localhost:8082/swagger-ui.html |
| notification-service | http://localhost:8083 | http://localhost:8083/swagger |
| ai-service | http://localhost:8084 | http://localhost:8084/docs |

## Endpoint Map

### Auth (gateway)
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/oauth/google
GET    /api/v1/auth/oauth/google/callback
```

### Users / addresses (gateway)
```
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/me/addresses
POST   /api/v1/me/addresses
PATCH  /api/v1/me/addresses/:id
DELETE /api/v1/me/addresses/:id
```

### Catalog (commerce-go)
```
GET    /api/v1/products            list w/ search, filter, sort, pagination
GET    /api/v1/products/:slug      detail
POST   /api/v1/products            (admin)
PATCH  /api/v1/products/:id        (admin)
DELETE /api/v1/products/:id        (admin, archive)
GET    /api/v1/categories
POST   /api/v1/categories          (admin)
PATCH  /api/v1/categories/:id      (admin)
GET    /api/v1/inventory/:productId (admin)
POST   /api/v1/inventory/:productId/adjust  (admin)
POST   /api/v1/internal/products/quote      (internal: authoritative prices)
POST   /api/v1/inventory/reserve            (internal: order-service)
POST   /api/v1/internal/inventory/:orderId/release  (internal)
POST   /api/v1/internal/inventory/:orderId/confirm (internal)
```

Internal commerce endpoints require `X-Internal-Token`, matching
`INTERNAL_SERVICE_TOKEN`. Product list/detail responses use a 30-second Redis
cache; catalog writes bump the cache version. The commerce API rate limit is
120 requests per client IP per minute.

### Cart (commerce-go)
```
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id
```

### Orders (order-service)
```
POST   /api/v1/orders
GET    /api/v1/orders/:orderNumber
GET    /api/v1/orders/:orderNumber/history
```

Create order accepts `userId`, `items: [{productId, quantity}]`, and an optional
shipping-address snapshot. The order service obtains current names/prices from
commerce internally; client-provided prices are not accepted. The resulting
order UUID is the inventory reservation reference.

### Payments (order-service)
```
POST   /api/v1/orders/:orderNumber/payments
GET    /api/v1/payments/:id
POST   /api/v1/payments/:id/simulate-success (mock provider only; opt-in)
```

The mock provider creates a 15-minute payment session. Set
`PAYMENT_SIMULATION_ENABLED=true` only for local sandbox use. Successful
simulation confirms the inventory reservation and transitions the order to
`PAID`; expired sessions release stock and transition the order to `EXPIRED`.
Verified payment webhooks are a later phase.

### Notifications (notification-service)
```
GET    /api/v1/notifications       (own history)
GET    /api/v1/admin/notifications (admin)
```

### AI (ai-service)
```
POST   /api/v1/assistant/chat      (session-scoped, auth required)
POST   /api/v1/assistant/tickets   (create support ticket)
```

### Ops
```
GET    /health                     liveness (all services)
GET    /ready                      readiness (all services)
GET    /metrics                    Prometheus (all services)
```
