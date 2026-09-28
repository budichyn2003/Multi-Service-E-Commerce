# MarketForge — Architecture Decision Records

Format per ADR: **Context → Decision → Alternatives → Consequences**.

---

## ADR-001 — Go for the Core Commerce Service

**Context:** Catalog, inventory, and cart are read-heavy, latency-sensitive, and involve concurrency-critical inventory reservation.

**Decision:** Implement core commerce in Go with `net/http` (chi router), pgx for PostgreSQL.

**Alternatives:** NestJS (faster to write, weaker concurrency story); Java (heavier footprint for a small service).

**Consequences:** Learn Go goroutines/context idioms; manual DTO wiring; excellent single-binary Docker images.

---

## ADR-002 — Spring Boot for the Order Service

**Context:** Orders need rich domain modeling (state machine, validation, transactions, history) — a good fit for JPA + declarative transactions.

**Decision:** Java 21 + Spring Boot 3, Spring Web + Spring Data JPA, Flyway migrations.

**Alternatives:** Go again (less to learn); Node (transaction story weaker).

**Consequences:** Two language ecosystems to maintain; strong transaction management out of the box.

---

## ADR-003 — ASP.NET Core for the Notification Service

**Context:** Notifications are I/O-bound (send email, record attempts, retry) with template rendering.

**Decision:** .NET 8 + ASP.NET Core minimal APIs + EF Core + Serilog.

**Alternatives:** Reuse Go (no new learning); Python (async fine but another framework overlap with FastAPI).

**Consequences:** Demonstrates async/await + DI + EF Core patterns distinct from JPA.

---

## ADR-004 — PostgreSQL as the Primary Store

**Context:** Need relational integrity (orders/inventory invariants), full-text search initially, JSONB for snapshots, and optionally pgvector for AI.

**Decision:** Single PostgreSQL 16 instance, one schema per service.

**Alternatives:** Separate DB engines per service immediately (operational cost too high early); MySQL (weaker FTS/pgvector story).

**Consequences:** One backup target; schema ownership enforced by convention; clean split later.

---

## ADR-005 — Redis for Cache, Rate Limiting, and Selected Locks

**Context:** Product reads are hot; login/AI endpoints need protection; a few concurrency spots benefit from a fast shared store.

**Decision:** Redis 7 for product cache (TTL + explicit invalidation), sliding-window rate limits, OTP-style temp data. Distributed locks only where a real race exists.

**Alternatives:** In-process cache (doesn't work across replicas); DB-only rate limiting (slow, racy).

**Consequences:** Must design invalidation carefully; cache stampede becomes a real failure mode to test.

---

## ADR-006 — RabbitMQ for Async Events

**Context:** Notifications, search indexing, and analytics should not run inline with checkout.

**Decision:** RabbitMQ 3.13 with a topic exchange, durable queues, manual acks, retry queue, DLQ.

**Alternatives:** Kafka (overkill pre-streaming use case); DB polling (poor latency, more code).

**Consequences:** Need consumer idempotency + DLQ operations; eventual consistency in UI.

---

## ADR-007 — REST for Sync, Events for Async

**Context:** Some interactions need an immediate answer; others must not block.

**Decision:** REST between services for synchronous reads/commands (order→inventory reserve). RabbitMQ for domain events (OrderPaid → notifications).

**Alternatives:** gRPC everywhere (more codegen, less REST learning); everything async (harder correctness for checkout).

**Consequences:** Clear rule: "need an answer now → REST; can happen later → event."

---

## ADR-008 — Payment Provider via Adapter (sandbox-first)

**Context:** Payment integration must be swappable and testable without real money.

**Decision:** `PaymentProvider` interface (`createPayment`, `getPaymentStatus`, `verifyWebhook`, `refund`) with a sandbox adapter (Midtrans sandbox first) and a mock adapter for tests.

**Alternatives:** Direct provider SDK calls (vendor lock-in, untestable); Stripe-only (doesn't match target market).

**Consequences:** Webhook signature verification differs per adapter; provider selection documented per environment.

---

## ADR-009 — Cache Strategy: Cache-Aside with Explicit Invalidation

**Context:** Product detail is read far more often than written.

**Decision:** Cache-aside on `GET /products/:slug` (Redis, TTL 5 min). On product mutation → delete keys (`product:{id}`, `product:slug:{slug}`) and publish `ProductUpdated` for other consumers.

**Alternatives:** Write-through (more writes, rarely needed here); TTL-only (staler reads after admin edits).

**Consequences:** Brief staleness window is acceptable and documented; stampede protected via single-flight lock.

---

## ADR-010 — AI Tool Calling Through Internal APIs

**Context:** The AI must answer product/order questions without DB access or cross-user leakage.

**Decision:** FastAPI exposes an assistant that calls **tools**, and each tool forwards the user's authenticated identity to the owning service's REST API. The LLM sees only tool results.

**Alternatives:** LLM with SQL access (security failure); pre-baked prompt context (token cost, staleness).

**Consequences:** Authorization enforced once, in services; every AI answer is auditable via tool-call logs.
