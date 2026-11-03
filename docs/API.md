# MarketForge — API Conventions & Specifications

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

## Success Envelope

Single item or action result:
```json
{
  "success": true,
  "data": { ... }
}
```

Collections:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

## Pagination

- Offset (standard): `?page=1&limit=20`, `limit` capped at 100
- Cursor (advanced): `?cursor=base64key&limit=20`

## Idempotency

Write endpoints that must not double-apply accept:

```
Idempotency-Key: <uuid>
```

First request executes and stores the result; a replay returns the cached
response. Same key + different body → `409`.
Applied to: `POST /orders`, `POST /payments`, `POST /payments/webhook`.

## Authentication & Identity Injection

```
Authorization: Bearer <access-token>
```

Access token: JWT, signed with `JWT_ACCESS_SECRET`, TTL 15 minutes.
Refresh token: JWT, signed with `JWT_REFRESH_SECRET`, TTL 30 days.

When traffic traverses the API Gateway:
- JWT is verified.
- The Gateway injects trusted internal headers:
  - `X-User-Id`: user UUID
  - `X-User-Role`: `CUSTOMER` | `ADMIN`
  - `X-Request-Id`: correlation ID
  - `X-Internal-Token`: internal service secret

## Service Index

| Service | Base URL (docker) | Host Port | Docs |
|---|---|---|---|
| gateway | http://localhost:8080 | 8080 | http://localhost:8080/health |
| commerce-go | http://localhost:8081 | 8081 | http://localhost:8081/health |
| order-service | http://localhost:8082 | 8082 | http://localhost:8082/actuator/health |
| notification-service | http://localhost:8083 | 8083 | http://localhost:8083/swagger |
| ai-service | http://localhost:8084 | 8084 | http://localhost:8084/docs |

---

## Detailed Endpoint Map

### 1. Auth & Profile (Gateway)

#### `POST /api/v1/auth/register`
* **Auth**: Public
* **Request**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e9b28a9c-76b4-4b53-b9dc-089cfa1f4f41",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "CUSTOMER",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

#### `POST /api/v1/auth/login`
* **Auth**: Public
* **Request**:
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e9b28a9c-76b4-4b53-b9dc-089cfa1f4f41",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "CUSTOMER",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

#### `POST /api/v1/auth/refresh`
* **Request**: `{ "refreshToken": "eyJhbGciOi..." }`
* **Response (200 OK)**: `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

#### `POST /api/v1/auth/logout`
* **Request**: `{ "refreshToken": "eyJhbGciOi..." }`
* **Response (200 OK)**: `{ "success": true, "data": { "message": "Logged out successfully" } }`

#### `GET /api/v1/me`
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "created_at": "...",
    "updated_at": "...",
    "last_login_at": "..."
  }
}
```

#### `PATCH /api/v1/me`
* **Auth**: Bearer Token
* **Request**: `{ "name": "Jane Updated" }`
* **Response (200 OK)**: `{ "success": true, "data": { ... } }`

#### `GET /api/v1/me/addresses`
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "label": "Home",
      "recipient_name": "Jane Doe",
      "phone": "+62812345678",
      "address_line": "Jl. Mawar No. 12",
      "city": "Jakarta Selatan",
      "province": "DKI Jakarta",
      "postal_code": "12190",
      "country": "ID",
      "is_default": true
    }
  ]
}
```

#### `POST /api/v1/me/addresses`
* **Auth**: Bearer Token
* **Request**:
```json
{
  "label": "Office",
  "recipient_name": "Jane Doe",
  "phone": "+62812345678",
  "address_line": "Jl. Sudirman Kav 21",
  "city": "Jakarta Pusat",
  "province": "DKI Jakarta",
  "postal_code": "10220",
  "country": "ID",
  "is_default": false
}
```
* **Response (201 Created)**: `{ "success": true, "data": { ... } }`

#### `PATCH /api/v1/me/addresses/:id`
* **Auth**: Bearer Token
* **Request**: `{ "recipient_name": "Jane D", "is_default": true }`

#### `DELETE /api/v1/me/addresses/:id`
* **Auth**: Bearer Token
* **Response (200 OK)**: `{ "success": true, "data": { "message": "Address deleted successfully" } }`

---

### 2. Catalog & Cart (Commerce-Go)

* `GET /api/v1/products` — List products (query: `q`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`)
* `GET /api/v1/products/:slug` — Product detail
* `GET /api/v1/categories` — List active categories
* `POST /api/v1/cart/items` — Add product to cart `{ "productId": "...", "quantity": 1 }`
* `GET /api/v1/cart` — Get user cart and calculated items
* `PATCH /api/v1/cart/items/:id` — Update quantity `{ "quantity": 3 }`
* `DELETE /api/v1/cart/items/:id` — Remove item from cart
* `POST /api/v1/checkout` — Validate cart & reserve inventory snapshot

#### Admin Catalog Endpoints (Role: ADMIN)
* `POST /api/v1/admin/products`
* `GET /api/v1/admin/products/:id`
* `PATCH /api/v1/admin/products/:id`
* `DELETE /api/v1/admin/products/:id` (archive)
* `POST /api/v1/admin/categories`
* `PATCH /api/v1/admin/categories/:id`
* `DELETE /api/v1/admin/categories/:id`
* `POST /api/v1/admin/inventory/:productId/adjust` `{ "quantityDelta": 10 }`

---

### 3. Orders & Payments (Order Service)

#### `GET /api/v1/orders`
* **Auth**: Bearer Token
* **Description**: Returns the orders for the authenticated customer. If admin, returns all orders.

#### `POST /api/v1/orders`
* **Auth**: Bearer Token
* **Request**:
```json
{
  "items": [
    { "productId": "2b9ad7ec-14a5-4eb8-b9f8-66d5be9b1681", "quantity": 2 }
  ],
  "shippingAddressJson": "{\"recipient_name\":\"Jane\",\"address_line\":\"Jl. Demo No 1\"}"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "01J9Z...",
    "orderNumber": "ORD-20261103-B4R2",
    "status": "PENDING_PAYMENT",
    "subtotal": 251.00,
    "shippingAmount": 10000.00,
    "totalAmount": 10251.00,
    "currency": "IDR",
    "items": [ ... ],
    "createdAt": "2026-11-03T03:47:16Z"
  }
}
```

#### `GET /api/v1/orders/:orderNumber`
* Returns order details and line item snapshots.

#### `GET /api/v1/orders/:orderNumber/history`
* Returns order status audit timeline (`from_status`, `to_status`, `reason`, `actor_type`, `created_at`).

#### `POST /api/v1/orders/:orderNumber/cancel`
* **Auth**: Bearer Token
* Cancels an eligible order (`PENDING_PAYMENT` or `PAID`) and automatically releases inventory reservation.

#### `POST /api/v1/orders/:orderNumber/status`
* **Auth**: Admin or System
* Transitions order status validated by state machine.

#### `POST /api/v1/orders/:orderNumber/payments`
* Initiates payment session with payment provider (15-minute TTL).
* **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "orderId": "...",
    "amount": 10251.00,
    "currency": "IDR",
    "status": "PENDING",
    "expiresAt": "...",
    "checkoutUrl": "..."
  }
}
```

#### `GET /api/v1/payments/:id`
* Returns payment session status.

#### `POST /api/v1/payments/:id/simulate-success`
* Sandbox payment simulation (when `PAYMENT_SIMULATION_ENABLED=true`).
* Automatically confirms inventory reservation and transitions order to `PAID`.

#### `POST /api/v1/payments/webhook`
* **Auth**: Webhook signature verification (`X-Callback-Signature`)
* Idempotent payment callback handler via `external_event_id`.

---

### 4. Notifications (Notification Service)

#### `GET /api/v1/notifications`
* Returns user notification history (email delivery records).

#### `POST /api/v1/notifications`
* Directly send an email notification:
```json
{
  "recipient": "customer@example.com",
  "subject": "Informasi Pesanan",
  "body": "Pesanan Anda telah dikirim.",
  "channel": "EMAIL"
}
```

#### `POST /api/v1/notifications/send-template`
* Renders email template (`ORDER_CREATED`, `ORDER_PAID`, `ORDER_CANCELLED`) with variable substitution:
```json
{
  "templateKey": "ORDER_PAID",
  "recipient": "customer@example.com",
  "variables": {
    "orderNumber": "ORD-20261103-B4R2",
    "totalAmount": "10.251"
  }
}
```

#### `GET /api/v1/admin/notifications`
* (Admin) Paginated list of all system notifications with status filter (`SENT`, `FAILED`, `PENDING`).

---

### 5. AI Assistant (AI Service)

#### `POST /api/v1/assistant/chat`
* **Auth**: Bearer Token or Public
* **Request**:
```json
{
  "message": "Cari produk laptop harga di bawah 10 juta",
  "order_number": null
}
```
* **Response (200 OK)**:
```json
{
  "answer": "Berikut produk yang ditemukan: Laptop Pro (Rp 8.500.000).",
  "tools_used": ["search_products"],
  "sources": ["products"]
}
```

#### `POST /api/v1/assistant/tickets`
* **Auth**: Bearer Token
* **Request**:
```json
{
  "subject": "Kendala Pembayaran",
  "description": "Pembayaran berhasil didebet namun status belum terupdate",
  "order_number": "ORD-20261103-B4R2"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "c138fd94-f20c-4613-8cfb-62c647b0e271",
    "userId": "...",
    "orderNumber": "ORD-20261103-B4R2",
    "subject": "Kendala Pembayaran",
    "description": "...",
    "status": "OPEN",
    "createdAt": "2026-11-03T04:20:00Z"
  }
}
```

---

### 6. Health & Observability (All Services)

* `GET /health` — Liveness probe (HTTP 200 `{"status": "ok"}`)
* `GET /ready` — Readiness probe (database & cache connectivity verified)
* `GET /metrics` — Prometheus metrics
