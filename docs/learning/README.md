# MarketForge — Engineering Learning Tracker & Technical Takeaways

MarketForge was constructed as a rigorous, polyglot reference architecture. Building across five distinct backend platforms and a modern frontend framework provides concrete hands-on mastery over diverse software engineering paradigms.

---

## 1. Polyglot Backend Competencies

### 1.1 Go (`apps/commerce-go`)
- **Idiomatic Concurrency**: Designing safe, atomic inventory reservation algorithms using database transactions with row-level locking (`SELECT ... FOR UPDATE`) and sorted resource acquisition to prevent distributed deadlocks.
- **Microservices Tooling**: Structuring Go applications with `chi` router, native `net/http`, and the high-performance PostgreSQL driver `pgx/v5` with connection pooling (`pgxpool.Pool`).
- **Redis Integration**: Implementing sub-millisecond cache-aside reads with TTL and explicit key invalidation pipelines on catalog mutations using `go-redis/v9`.

### 1.2 Java & Spring Boot 3 (`apps/order-service`)
- **Domain-Driven Design (DDD)**: Modeling complex entity relationships and audit lifecycles with JPA entities (`Order`, `OrderItem`, `OrderHistory`, `Payment`).
- **State Machine Enforcement**: Protecting order status transitions with strict validation preventing illegal transitions (e.g. `DELIVERED` → `CANCELLED`).
- **Declarative Transactions**: Using `@Transactional` to guarantee ACID compliance during checkout order creation and payment settlement.
- **Database Evolution**: Automating versioned schema migrations via Flyway (`V1__orders.sql`, `V2__payments.sql`).

### 1.3 C# & ASP.NET Core 8 (`apps/notification-service`)
- **Minimal APIs**: Constructing lightweight, high-throughput microservices using ASP.NET Core's minimal API syntax.
- **Entity Framework Core**: Managing asynchronous data access with `Npgsql.EntityFrameworkCore.PostgreSQL`.
- **Email Delivery Pipeline**: Integrating MailKit and MimeKit for MIME message formatting, dynamic variable substitution in HTML templates, and delivery attempt audit tracking.
- **Structured Logging**: Configuring Serilog with contextual properties for distributed trace correlation.

### 1.4 Python & FastAPI (`apps/ai-service`)
- **FastAPI & Pydantic v2**: Building async APIs with automatic request validation, type checking, and Swagger UI generation.
- **Tool Calling Pattern**: Implementing the server-side tool calling pattern where the LLM does not possess database access, but instead requests tool invocations that execute authenticated REST requests to internal microservices.
- **Guardrails & Safety**: Enforcing input validation and output sanitization to prevent prompt injection and credential leakage.

### 1.5 TypeScript & NestJS (`apps/gateway`)
- **Gateway & BFF Architecture**: Centralizing authentication, rate limiting, and request correlation at the edge.
- **Authentication Lifecycle**: Generating, validating, and rotating HMAC-SHA256 JWTs with bcrypt password hashing.
- **Reverse Proxy**: Efficiently streaming HTTP requests to downstream microservices using custom HTTP client forwarding with header injection.

---

## 2. Frontend Engineering (Next.js 14 & React 18)

- **Next.js 14 App Router**: Organizing routes across dynamic parameters (`[slug]`, `[paymentId]`, `[orderNumber]`) and nested layouts (`/admin`).
- **CSR Bail-out & Suspense Boundaries**: Properly isolating client-side query parameters (`useSearchParams`) inside `<Suspense>` boundaries to preserve Next.js build optimizations.
- **Context & State Management**: Implementing `AuthProvider` and `CartProvider` to smoothly synchronize guest local storage carts with authenticated backend carts.
- **Hallmark UI/UX Standard**: Building clean, accessible, and responsive user interfaces with consistent loading, error, empty, and success states across customer and admin workflows.

---

## 3. Distributed Systems & Reliability Engineering

| Engineering Principle | Implementation in MarketForge |
|---|---|
| **Database-Per-Service** | PostgreSQL schemas (`commerce`, `orders`, `payments`, `notifications`, `ai`) owned exclusively by individual services. |
| **Row-Level Locking** | `SELECT ... FOR UPDATE` in PostgreSQL during inventory reservation to prevent race conditions during high-concurrency checkout. |
| **Idempotency** | Webhook deduplication using unique `external_event_id` records in `payments.webhook_events`. |
| **Cache-Aside Pattern** | Redis caching for hot product reads with immediate cache invalidation on admin edits. |
| **Dead-Letter Queue (DLQ)** | RabbitMQ dead-letter exchange (`marketforge.dlx`) capturing failed notification messages after 3 retries. |
| **Correlation Tracing** | Propagating `X-Request-Id` across Gateway, downstream services, and structured JSON logs. |
