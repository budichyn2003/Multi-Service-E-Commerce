# MarketForge — Developer Task Runner

.DEFAULT_GOAL := help
SHELL := /bin/bash

# -----------------------------------------------------------------------------
# Docker
# -----------------------------------------------------------------------------

.PHONY: up
up: ## Start the full stack (docker compose up -d)
	docker compose up -d

.PHONY: up-build
up-build: ## Start the full stack, rebuilding images
	docker compose up -d --build

.PHONY: down
down: ## Stop the stack
	docker compose down

.PHONY: down-volumes
down-volumes: ## Stop the stack and remove volumes (DESTROYS data)
	docker compose down -v

.PHONY: logs
logs: ## Tail logs from all services
	docker compose logs -f --tail=100

.PHONY: ps
ps: ## Show container status
	docker compose ps

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------

.PHONY: migrate
migrate: ## Run database migrations (all schemas)
	./scripts/migrate.sh

.PHONY: seed
seed: ## Seed database with demo data
	./scripts/seed.sh

.PHONY: psql
psql: ## Open a psql shell into the postgres container
	docker compose exec postgres psql -U $${POSTGRES_USER:-marketforge} -d $${POSTGRES_DB:-marketforge}

.PHONY: redis-cli
redis-cli: ## Open a redis-cli shell into the redis container
	docker compose exec redis redis-cli

# -----------------------------------------------------------------------------
# Development (single service, hot reload)
# -----------------------------------------------------------------------------

.PHONY: dev-go
dev-go: ## Run Go commerce service locally with hot reload
	cd apps/commerce-go && go run ./cmd/server

.PHONY: dev-ai
dev-ai: ## Run FastAPI AI service locally with reload
	cd apps/ai-service && uvicorn app.main:app --reload --port 8000

.PHONY: dev-web
dev-web: ## Run Next.js frontend locally
	cd apps/web && npm run dev

.PHONY: dev-gateway
dev-gateway: ## Run API gateway locally
	cd apps/gateway && npm run start:dev

.PHONY: dev-order
dev-order: ## Run Spring Boot order service locally
	cd apps/order-service && ./mvnw spring-boot:run

.PHONY: dev-notification
dev-notification: ## Run .NET notification service locally
	cd apps/notification-service && dotnet run

# -----------------------------------------------------------------------------
# Quality
# -----------------------------------------------------------------------------

.PHONY: test
test: ## Run tests for all services
	./scripts/test.sh

.PHONY: lint
lint: ## Lint all services
	./scripts/lint.sh

.PHONY: build
build: ## Build all service images
	docker compose build

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'
