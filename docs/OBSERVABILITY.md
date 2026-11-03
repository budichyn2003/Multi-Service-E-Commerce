# MarketForge — Observability

## Structured Logs

Every service emits **JSON logs to stdout**:

```json
{
  "timestamp": "2026-09-27T08:15:30.123Z",
  "level": "info",
  "service": "commerce-go",
  "request_id": "req_01J9Z0K4M2",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "method": "GET",
  "path": "/api/v1/products/abc",
  "status_code": 200,
  "duration_ms": 12,
  "message": "request completed"
}
```

Rules:

- The gateway generates `X-Request-Id` (accepts incoming one) and propagates it
  to every downstream service; all log lines for a request carry it.
- `trace_id` comes from W3C Trace Context headers (OpenTelemetry).
- **Never log:** passwords, tokens, payment keys, full card/PAN, personal secrets.
- Levels: `debug` (dev), `info` (default), `warn` (retries, fallbacks), `error` (failures needing attention).

Implementations: Go `slog`, Spring `logstash-logback-encoder`, .NET
`Serilog`, Python `structlog`, Node `pino`.

## Health Checks

| Endpoint | Meaning | Checks |
|---|---|---|
| `/health` (liveness) | Process is up | None — always OK if responding |
| `/ready` (readiness) | Can serve traffic | PostgreSQL ping, Redis ping, RabbitMQ connection |

Docker Compose uses these for dependency ordering & restart decisions.

## Metrics (Prometheus)

Every service exposes `GET /metrics`.

| Metric | Type | Labels |
|---|---|---|
| `http_requests_total` | counter | service, route, method, status |
| `http_request_duration_seconds` | histogram | service, route |
| `db_query_duration_seconds` | histogram | service, operation |
| `cache_hits_total` / `cache_misses_total` | counter | service, cache |
| `queue_depth` | gauge | queue |
| `queue_processing_duration_seconds` | histogram | queue, consumer |
| `payment_failures_total` | counter | provider, reason |
| `notification_failures_total` | counter | channel, reason |
| `ai_request_duration_seconds` | histogram | model |
| `ai_tokens_used_total` | counter | model, kind |

## OpenTelemetry Tracing

Instrumented where practical across Next.js, Go, Spring Boot, .NET, FastAPI.

Target trace — one user checkout across the system:

```text
HTTP POST /checkout (web)
  └─ gateway (auth, request id)
       └─ order-service: create order
            ├─ commerce-go: reserve inventory
            │    └─ PostgreSQL UPDATE ... FOR UPDATE
            ├─ order-service: insert order + items
            └─ payment provider API call
       └─ rabbitmq publish OrderPaid
            └─ notification-service consume → email send
```

Exporter: OTLP → collector/Jaeger (dev). Sampling: parent-based, 100% dev,
10% prod (tunable).

## Grafana Dashboards

Provisioned in `infrastructure/grafana/provisioning/`:

1. **Platform overview** — req/s, error rate, P50/P95/P99 latency per service
2. **Data stores** — DB query latency, Redis hit rate
3. **Queues** — RabbitMQ depth, consumer time, DLQ count
4. **Business** — orders/min, payment failure rate, notification failures, AI latency

## Alerting (later phase)

Start with dead-man rules only: service down, error rate > 5%, DLQ growing,
payment webhook failures. Avoid alert noise.
