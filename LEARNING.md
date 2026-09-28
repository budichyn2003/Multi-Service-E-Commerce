# MarketForge — Learning Tracker

Update as you work. Rule (requirements §94): *requirement → learn only what's
needed → implement → break it → debug → test → document → next.*

## Backend
- [ ] Go fundamentals in context
- [ ] Go REST API
- [ ] Go PostgreSQL
- [ ] Go testing
- [ ] Spring Boot
- [ ] Spring Data JPA
- [ ] Spring Security
- [ ] ASP.NET Core
- [ ] Entity Framework Core
- [ ] FastAPI

## Data
- [ ] PostgreSQL indexing
- [ ] Transactions
- [ ] Isolation levels
- [ ] Locking
- [ ] Query optimization
- [ ] Redis cache
- [ ] Redis rate limiting
- [ ] Redis TTL
- [ ] MongoDB (optional)
- [ ] Elasticsearch/OpenSearch (optional)

## Distributed Systems
- [ ] RabbitMQ
- [ ] Consumer
- [ ] Producer
- [ ] Retry
- [ ] DLQ
- [ ] Idempotency
- [ ] Eventual consistency
- [ ] Outbox Pattern
- [ ] Kafka (optional)
- [ ] Saga (optional)

## Integrations
- [ ] Payment gateway
- [ ] Payment webhook
- [ ] Webhook signature verification
- [ ] OAuth
- [ ] Email
- [ ] Object storage
- [ ] WhatsApp (optional)

## Security
- [ ] JWT
- [ ] Refresh token
- [ ] RBAC
- [ ] Rate limiting
- [ ] CORS
- [ ] XSS awareness
- [ ] CSRF awareness
- [ ] SQL injection prevention
- [ ] SSRF awareness
- [ ] Secret management
- [ ] Audit logging

## Infrastructure
- [ ] Docker
- [ ] Docker Compose
- [ ] Multi-stage build
- [ ] Container health checks
- [ ] CI/CD
- [ ] Cloud deployment
- [ ] Kubernetes (optional)

## Observability
- [ ] Structured logging
- [ ] Request IDs
- [ ] Health checks
- [ ] Metrics
- [ ] Prometheus
- [ ] Grafana
- [ ] OpenTelemetry
- [ ] Distributed tracing

## AI
- [ ] LLM API
- [ ] Tool calling
- [ ] RAG
- [ ] Embeddings
- [ ] Vector search
- [ ] Guardrails
- [ ] AI evaluation
- [ ] AI observability

## Engineering
- [ ] ADRs
- [ ] API documentation
- [ ] Architecture documentation
- [ ] Failure testing
- [ ] Performance testing
- [ ] Security review
- [ ] Production deployment
- [ ] Portfolio README

## Session Notes

| Date | Phase | What was done | What broke / lesson |
|---|---|---|---|
| 2026-09-27 | 0 | Repo scaffold, compose stack, docs, service skeletons | — |
| 2026-09-28 | 0→1 | Dockerfile network-resilience (pip/npm timeout env); Phase 1 Go: admin CRUD + RBAC guard, cart, atomic checkout reservation | pip default 15s timeout killed builds on slow network — set PIP_DEFAULT_TIMEOUT/PIP_RETRIES; legacy orderIdToken violated uuid validation → tightened contract on both sides |
