# MarketForge — Architecture Decision Records (ADR)

This folder tracks architectural decisions made throughout the design and evolution of MarketForge. Each record documents the context, decision, alternatives evaluated, and technical consequences.

---

## ADR Index

| ADR | Title | Status | Primary Technology | Summary |
|---|---|---|---|---|
| [**ADR-001**](./#adr-001--go-for-the-core-commerce-service) | Go for Core Commerce Service | Accepted | Go, Chi, pgx, go-redis | High-throughput, read-heavy catalog & atomic inventory locks using Go's lightweight concurrency model. |
| [**ADR-002**](./#adr-002--spring-boot-for-the-order-service) | Spring Boot for Order Service | Accepted | Java 21, Spring Boot 3, JPA | Rich domain modeling, state machine enforcement, declarative ACID transactions, and Flyway migrations. |
| [**ADR-003**](./#adr-003--aspnet-core-for-notification-service) | ASP.NET Core for Notifications | Accepted | .NET 8, EF Core, MailKit | High-performance async I/O worker for template rendering and email dispatch via SMTP/MailHog. |
| [**ADR-004**](./#adr-004--postgresql-as-the-primary-store) | PostgreSQL as Primary Store | Accepted | PostgreSQL 16 | Relational data integrity, schema-per-service isolation, citext, and trigram full-text search. |
| [**ADR-005**](./#adr-005--redis-for-cache-and-rate-limiting) | Redis for Cache & Rate Limiting | Accepted | Redis 7 | Sub-millisecond catalog cache-aside with TTL and sliding-window rate limiting on the API Gateway. |
| [**ADR-006**](./#adr-006--rabbitmq-for-async-events) | RabbitMQ for Asynchronous Events | Accepted | RabbitMQ 3.13 | Topic exchange (`marketforge.events`), decoupled order-paid events, retries, and dead-letter queues. |
| [**ADR-007**](./#adr-007--rest-for-sync-events-for-async) | REST for Sync, Events for Async | Accepted | HTTP REST & AMQP | Immediate answers require REST (inventory reservation during checkout); background jobs use async events. |
| [**ADR-008**](./#adr-008--payment-provider-via-adapter) | Sandbox-First Payment Adapter | Accepted | Custom Adapter Pattern | Swappable `PaymentProvider` interface supporting local sandbox simulation and external webhook callbacks. |
| [**ADR-009**](./#adr-009--cache-strategy-cache-aside) | Cache-Aside with Invalidation | Accepted | Redis Cache-Aside | Caching `GET /products/:slug` (5m TTL) with proactive invalidation on admin product modifications. |
| [**ADR-010**](./#adr-010--ai-tool-calling-through-internal-apis)| AI Tool Calling via Internal APIs | Accepted | FastAPI & Tool Calling | AI assistant uses server-side tool calling with identity forwarding; LLM never has direct SQL access. |

---

## Detailed ADR Records

The full text and consequences of all ADRs can be viewed in [`docs/DECISIONS.md`](../DECISIONS.md).

### Proposing a New ADR
When proposing significant technical changes:
1. Create a markdown entry following the standard format:
   - **Context**: The problem being solved and forces at play.
   - **Decision**: The chosen technical path and rationale.
   - **Alternatives**: Other considered options and why they were rejected.
   - **Consequences**: Positive, neutral, and negative architectural trade-offs.
2. Link the new ADR in this index.
