# Operations Docs

- runbooks: service down, DLQ growing, payment webhook failures
- RabbitMQ retry policy: 3 attempts via TTL delay queue → DLQ
- scheduled jobs: expired payment cleanup, reservation release, notification retry
