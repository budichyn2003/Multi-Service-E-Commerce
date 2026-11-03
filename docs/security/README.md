# MarketForge — Security Architecture & Guidelines

This document details the security architecture, authentication mechanisms, authorization controls, and threat mitigation strategies implemented in MarketForge.

---

## 1. Trust Boundaries & Defense-in-Depth

MarketForge divides its architecture into strict trust zones:

```text
[Public Internet]
       │ HTTPS / Public Traffic
       ▼
[Edge / Web Frontend] (apps/web)
       │ HTTP / REST + Bearer Token
       ▼
[API Gateway] (apps/gateway)  <--- PRIMARY AUTHENTICATION BARRIER
       │ Internal Network Only (X-User-Id, X-User-Role, X-Internal-Token)
       ▼
[Downstream Services] (commerce-go, order-service, notification-service, ai-service)
       │ Parameterized Database Connections
       ▼
[Data Persistence] (PostgreSQL, Redis, RabbitMQ)
```

1. **Untrusted Zone**: Browser clients and public networks. All client requests are treated as untrusted and unauthenticated until validated.
2. **Gateway Zone**: The API Gateway (`apps/gateway`) acts as the single public entry point. It terminates public authentication, enforces rate limits, validates JWTs, and strips untrusted client headers.
3. **Internal Zone**: Downstream services communicate within a private Docker bridge network. Calls between services require the `X-Internal-Token` header.
4. **Data Zone**: PostgreSQL and Redis accept connections only with authentication credentials.

---

## 2. Authentication & JWT Token Lifecycle

### 2.1 Password Security
* **Storage**: Passwords are never stored in plaintext. They are hashed using bcrypt with salt rounds = 10 (`bcryptjs`).
* **Validation**: Passwords must be at least 8 characters long and undergo validation prior to hashing.

### 2.2 JWT Token Specifications
* **Access Token**:
  - Algorithm: HMAC-SHA256 (`HS256`)
  - Signed with: `JWT_ACCESS_SECRET` (minimum 32 characters)
  - Expiration: 15 minutes (`900s`)
  - Payload claims: `sub` (user UUID), `email`, `role`, `status`, `iat`, `exp`
* **Refresh Token**:
  - Signed with: `JWT_REFRESH_SECRET`
  - Expiration: 30 days (`30d`)
  - Stored in Redis with expiration matching the token TTL.
  - Used strictly at `POST /api/v1/auth/refresh` to mint new access tokens without requiring re-entry of user credentials.
* **Logout & Revocation**:
  - Calling `POST /api/v1/auth/logout` invalidates the active refresh token session in Redis.

---

## 3. Role-Based Access Control (RBAC)

MarketForge enforces authorization checks **server-side** on every privileged operation:

| Role | Permitted Actions | Prohibited Actions |
|---|---|---|
| **Anonymous** | Browse catalog, view products, calculate carts, submit public contact/AI questions | Access user profile, checkout, view orders, admin routes |
| **CUSTOMER** | Manage own cart, checkout, view own orders/payments, manage own delivery addresses, chat with AI | Access `/admin/*` routes, view other users' orders/addresses, modify product catalog |
| **ADMIN** | All customer capabilities + product CRUD, stock adjustment, category CRUD, view all system orders, transition order states, audit notifications | Cannot forge payment signatures |

### Enforcement Points
1. **API Gateway Role Guard**: Rejects unauthorized requests before they reach downstream services:
   ```typescript
   if (req.originalUrl.startsWith('/api/v1/admin') && user.role !== 'ADMIN') {
     return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin role required' } });
   }
   ```
2. **Service-Level Guards**: Downstream services inspect `X-User-Role` and verify `X-Internal-Token` to ensure requests originated from the Gateway.

---

## 4. Internal Microservice Security

To prevent spoofing or unauthorized direct communication:
1. **Header Stripping**: The Gateway removes incoming client headers matching `X-User-Id`, `X-User-Role`, and `X-Internal-Token` before evaluating the request.
2. **Internal Token Injection**: Upon validating the user, the Gateway injects:
   - `X-User-Id`: Authenticated user UUID
   - `X-User-Role`: `CUSTOMER` or `ADMIN`
   - `X-Request-Id`: Tracing correlation UUID
   - `X-Internal-Token`: Secret string configured via `INTERNAL_SERVICE_TOKEN` in `.env`
3. **Internal Route Protection**: Endpoints like `POST /internal/products/quote` in `commerce-go` strictly verify `X-Internal-Token`. If the token does not match, the request is rejected with `401 Unauthorized`.

---

## 5. Webhook Security & Idempotency

External payment notifications (`POST /api/v1/payments/webhook`) are secured against spoofing and replays:
1. **HMAC Signature**: The incoming request includes an HMAC signature header (`X-Callback-Signature`).
2. **Signature Verification**: The signature is verified using `PAYMENT_WEBHOOK_SECRET` with a constant-time comparison to prevent timing attacks.
3. **Idempotency Key**: Each webhook notification carries an `external_event_id`. The order service logs this ID in `payments.webhook_events`. If a duplicate ID arrives, the service immediately returns HTTP 200 without re-executing state transitions.

---

## 6. Threat Mitigation Matrix

| Vulnerability | Attack Vector | Mitigation in MarketForge |
|---|---|---|
| **SQL Injection** | Malicious input in queries | 100% parameterized queries across all services (`pgx` query arguments, Spring Data JPA, EF Core LINQ, asyncpg). String concatenation in SQL is prohibited. |
| **Brute Force / Credential Stuffing** | Rapid login attempts | Redis sliding-window rate limiter on the Gateway (120 req/minute per IP) and constant-time password comparisons. |
| **Cross-Site Scripting (XSS)** | Injected scripts in product reviews/names | Next.js automatic JSX escaping. Product content is rendered as plain text or validated Markdown without `dangerouslySetInnerHTML`. |
| **Cross-Site Request Forgery (CSRF)** | Unauthorized browser actions | API Gateway accepts Bearer JWT tokens in the `Authorization` header rather than ambient ambient credentials. |
| **Server-Side Request Forgery (SSRF)** | Malicious URLs in AI or webhooks | Webhook callbacks use strict URL allowlists. Outbound HTTP requests from `ai-service` and `order-service` never accept raw external URLs from users. |
| **Prompt Injection** | Jailbreak attempts in AI assistant | Input is evaluated by `validate_question()` guardrail in `apps/ai-service/app/guardrails.py`. The AI assistant does not possess direct SQL access and must use internal API tools. |
