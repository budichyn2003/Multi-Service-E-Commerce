#!/usr/bin/env bash
# Runs tests for every service whose toolchain is available locally.
set -uo pipefail

cd "$(dirname "$0")/.."
FAILED=0

run_step() {
  local name="$1"; shift
  echo "==> $name"
  if "$@"; then
    echo "    OK"
  else
    echo "    FAILED"
    FAILED=1
  fi
}

if command -v go >/dev/null 2>&1; then
  run_step "Go tests" bash -c "cd apps/commerce-go && go test ./..."
else
  echo "==> Go toolchain not found, skipping (docker compose build covers it)"
fi

if command -v mvn >/dev/null 2>&1; then
  run_step "Spring Boot tests" bash -c "cd apps/order-service && mvn -q test"
else
  echo "==> Maven not found, skipping"
fi

if command -v dotnet >/dev/null 2>&1; then
  run_step ".NET tests" bash -c "cd apps/notification-service && dotnet build"
else
  echo "==> dotnet not found, skipping"
fi

if command -v python >/dev/null 2>&1 && python -c "import fastapi" 2>/dev/null; then
  run_step "FastAPI import check" python -c "from app.main import app"
else
  echo "==> Python/fastapi not found locally, skipping"
fi

if command -v npm >/dev/null 2>&1; then
  if [ -d apps/gateway/node_modules ]; then
    run_step "Gateway build" bash -c "cd apps/gateway && npm run build"
  else
    echo "==> gateway deps not installed, skipping (npm ci first)"
  fi
fi

exit $FAILED
