#!/usr/bin/env bash
# MarketForge — database migrations.
# Applies versioned SQL in order. Idempotent: safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

POSTGRES_USER="${POSTGRES_USER:-marketforge}"
POSTGRES_DB="${POSTGRES_DB:-marketforge}"

echo "==> Running migrations..."
for dir in scripts/migrations/commerce scripts/migrations/payments; do
  for file in "$dir"/*.sql; do
    [ -e "$file" ] || continue
    echo "    applying $file"
    docker compose exec -T postgres \
      psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$file"
  done
done

echo "==> Migrations complete."
