#!/usr/bin/env bash
# MarketForge — demo seed data (requirements §81).
set -euo pipefail

cd "$(dirname "$0")/.."

POSTGRES_USER="${POSTGRES_USER:-marketforge}"
POSTGRES_DB="${POSTGRES_DB:-marketforge}"

echo "==> Seeding demo data..."
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < scripts/seed/seed.sql

echo "==> Seed complete. Admin: admin@marketforge.local / password from seed docs."
