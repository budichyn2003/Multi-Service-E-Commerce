# MarketForge — Security

## Threat Model Overview

### Trust Boundaries

```text
[Internet] ──► [Next.js Web]            boundary 1: browser ↔ web
[Web] ──► [API Gateway]                 boundary 2: web ↔ gateway (auth here)
[Gateway] ──► [Internal Services]       boundary 3: gateway ↔ services (internal network)
[Payment Provider] ──► [Webhook]        boundary 4: external provider (signature verified)
[LLM Provider] ──► [AI Service]         boundary 5: external API (key only, no user data in prompt where avoidable)
```

### Sensitive Data

| Data | Handling |
|---|---|
| Passwords | Argon2id hash only; never logged, never returned |
| JWT secrets | Env-injected, rotated; access ≠ refresh secret |
| Refresh tokens | Hashed at rest in DB; revoked on logout; rotated on use |
| Payment credentials | Provider sandbox keys via env; never in repo or logs |
| Card data | **Never stored** — provider (gateway) tokenizes; we keep only status/IDs |
| Webhook signatures | Verified HMAC before processing |
| User PII | Minimal collection; audit logs exclude secrets |

### Attack Surfaces & Mitigations

| Surface | Threat | Mitigation |
|---|---|---|
| Login/register | Credential stuffing, brute force | Rate limiting (Redis), generic error messages |
| JWT | Token theft, forgery | Short TTL, HS256 with strong secret, HTTPS, httpOnly refresh cookie |
| Admin endpoints | Privilege escalation | Server-side RBAC on every handler, not frontend-only |
| SQL | Injection | Parameterized queries only (pgx/JPA/EF Core/sqlalchemy), no string concatenation |
| Webhook | Forgery, replay | HMAC signature verification + `external_event_id` idempotency |
| File upload | Malicious file | Type + size validation, random storage keys, no original filenames, no direct public write |
| SSRF | Internal network probing from AI/uploads | URL allowlists for outbound fetches; no user-supplied URLs fetched server-side |
| XSS | Script injection via product content | React auto-escaping; sanitize rich text; CSP headers |
| CSRF | Cross-site state change | SameSite cookies; state-changing endpoints require Bearer token (not cookie) |
| CORS | Cross-origin data theft | Explicit origin allowlist; no `*` with credentials |
| AI assistant | Prompt injection, data leakage | Tools carry the caller's authenticated identity; LLM never gets raw DB access; output filtered |

## Authentication

- **Registration:** unique normalized email, password min complexity (length ≥ 8, mixed classes), Argon2id hashing (memory-hard).
- **Login:** returns short-lived access JWT (15 min) + refresh token (30 d, rotated, hashed at rest, revocable).
- **Refresh:** exchange valid refresh → new access + rotated refresh. Reuse of a revoked refresh ⇒ revoke the whole family.
- **Logout:** revoke refresh token.
- **Account states:** `ACTIVE`, `SUSPENDED`, `DISABLED` — checked at login and on token-bearing requests via cached status.

## Authorization (RBAC)

Roles: `CUSTOMER`, `ADMIN` (optional later: `SELLER`, `SUPPORT`, `OPERATIONS`).

Permissions like `product:create`, `order:cancel`, `inventory:update` are
checked **server-side in each service handler**. The gateway performs coarse
role gating; services never trust headers from outside the cluster without
internal auth (shared secret / network isolation).

## Webhook Verification

```text
POST /webhooks/payment
  1. read raw body + signature header
  2. HMAC-SHA256 with provider secret over raw body
  3. constant-time compare
  4. store event (unique external_event_id) → duplicate = 200 OK, no reprocessing
  5. enqueue async processing
```

## Rate Limiting (Redis, sliding window)

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5 / minute / IP+email |
| `POST /auth/register` | 3 / minute / IP |
| AI chat | 10 / minute / user |
| Public product list | 60 / minute / IP |
| Webhooks | provider-scoped, generous |

## Security Headers (gateway / nginx)

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains (prod)
```

## Secret Management

- `.env` never committed (`.env.example` is the contract).
- CI/CD secrets via GitHub Actions secrets; prod via cloud secret manager.
- Secrets have owners and rotation notes in `docs/security/`.

## Audit Logging

Security-relevant events (`USER_LOGIN`, `USER_LOGOUT`, `PASSWORD_CHANGED`,
`ORDER_CANCELLED`, `ADMIN_ACTION`, `PAYMENT_UPDATED`, …) are recorded with
actor, resource, IP, user-agent — **never** passwords, tokens, or keys.
