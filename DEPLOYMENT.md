# MarketForge — Deployment

## Environments

| Env | Purpose | Data | Config source |
|---|---|---|---|
| `development` | local docker compose | seeded demo data | `.env` (gitignored) |
| `test` | CI pipelines | ephemeral containers | CI env vars |
| `staging` | pre-production validation | anonymized copy | platform secrets |
| `production` | live | real data | cloud secret manager |

Rules:

- Config comes **only** from environment variables; `.env.example` is the contract.
- Never commit real secrets (JWT keys, DB passwords, payment/OAuth/LLM keys).
- Each env is a separate compose project / namespace with its own database.

## Target Production Topology

```text
Frontend (Next.js)        → Vercel / container hosting
API Gateway + services    → container hosting (Fly.io / Railway / VPS+Docker)
PostgreSQL                → managed (Neon / RDS / Cloud SQL)
Redis                     → managed (Upstash / ElastiCache)
RabbitMQ                  → self-hosted container or CloudAMQP
Object storage            → S3 / R2 / MinIO
```

You do **not** need to deploy every experimental extension — one complete
environment (web + 4 backends + data stores) is the Phase 17 goal.

## CI/CD Pipeline

On pull request (`.github/workflows/ci.yml`):

```text
lint → unit tests → integration tests → docker build
```

On `main`:

```text
test → build images → push registry → deploy (staging) → (manual gate) → production
```

## Release Checklist

1. CI green on `main`
2. Images tagged with git SHA (immutable)
3. DB migrations run **before** new rollout (backward-compatible first)
4. Rolling deploy services one at a time; health checks gate progression
5. Smoke test: `/health` on all services + demo checkout
6. Rollback = redeploy previous image tag (migrations are expand/contract)

## Local Production Simulation

```bash
docker compose -f docker-compose.yml up -d --build
```

nginx (optional) terminates TLS and fronts gateway + web for a production-like
topology locally: `infrastructure/nginx/`.

## Backup & Recovery (learning goals)

- Postgres: scheduled `pg_dump` to object storage; restore drill documented.
- Volumes: named volumes for dev; managed snapshots for prod.
- RabbitMQ: durable queues + definitions export; messages are rebuildable events.
