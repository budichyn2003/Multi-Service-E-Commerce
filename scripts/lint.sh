#!/usr/bin/env bash
# Lints every service whose toolchain is available locally.
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

if command -v gofmt >/dev/null 2>&1; then
  run_step "gofmt check" bash -c "test -z \"\$(gofmt -l apps/commerce-go)\""
else
  echo "==> gofmt not found, skipping"
fi

if command -v dotnet >/dev/null 2>&1; then
  run_step "dotnet format check" bash -c "cd apps/notification-service && dotnet format --verify-no-changes"
else
  echo "==> dotnet not found, skipping"
fi

if command -v npx >/dev/null 2>&1 && [ -d apps/gateway/node_modules ]; then
  run_step "gateway tsc" bash -c "cd apps/gateway && npx tsc --noEmit"
else
  echo "==> gateway deps not installed, skipping"
fi

exit $FAILED
