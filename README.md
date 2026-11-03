# MarketForge — Multi-Service E-Commerce & Marketplace Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#testing--validation)
[![Architecture](https://img.shields.io/badge/architecture-polyglot--microservices-blue)](#architecture--system-design)
[![Package Manager](https://img.shields.io/badge/package_manager-pnpm-orange)](#prerequisites)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

MarketForge is an enterprise-grade, polyglot microservice e-commerce and marketplace platform built as a production-oriented reference implementation. It showcases how diverse backend ecosystems (Go, Java Spring Boot, C# ASP.NET Core, Python FastAPI, and TypeScript NestJS) work harmoniously behind an API Gateway to serve a high-performance Next.js 14 web application.

> Detailed design and product requirements are available in [`Multi-Service-E-Commerce-Marketplace-Requirements.md`](./Multi-Service-E-Commerce-Marketplace-Requirements.md).

---

## Table of Contents

- [Overview & Objectives](#overview--objectives)
- [Key Features & Capabilities](#key-features--capabilities)
- [Tech Stack](#tech-stack)
- [Architecture & System Design](#architecture--system-design)
- [Repository Structure](#repository-structure)
- [Service Directory & Ports](#service-directory--ports)
- [Prerequisites & Toolchain](#prerequisites--toolchain)
- [Environment Configuration](#environment-configuration)
- [Quickstart: Full Docker Compose](#quickstart-full-docker-compose)
- [Local Development (Hybrid / Native Mode)](#local-development-hybrid--native-mode)
  - [Windows PowerShell Guide](#windows-powershell-guide)
  - [Git Bash / Linux Guide](#git-bash--linux-guide)
- [Database Migrations & Seed Data](#database-migrations--seed-data)
- [Demo Accounts](#demo-accounts)
- [Testing & Validation](#testing--validation)
- [Observability & Monitoring](#observability--monitoring)
- [Troubleshooting](#troubleshooting)
- [Documentation Index](#documentation-index)

---

## Overview & Objectives

MarketForge was designed to demonstrate clean architectural boundaries, robust inter-service communication, distributed transaction handling, and defense-in-depth security across multiple technology stacks:

1. **Polyglot Engineering**: Selecting the optimal tool for specific business domains:
   - **Go**: High-throughput catalog queries & atomic inventory row locks.
   - **Spring Boot (Java)**: Transactional order state machines, quotes, and payment orchestration.
   - **ASP.NET Core (C#)**: Asynchronous template rendering and email dispatch.
   - **FastAPI (Python)**: LLM orchestration and server-side tool calling with security guardrails.
   - **NestJS (Node.js)**: Edge API gateway, JWT authentication lifecycle, reverse proxying, and Redis sliding-window rate limiting.
   - **Next.js 14 (React)**: High-performance storefront and admin panels.
2. **Resilience & Concurrency**: Atomic inventory reservation via PostgreSQL row-level locks (`SELECT ... FOR UPDATE`), Redis rate limiting, cache-aside caching with stampede protection, and RabbitMQ message queues with Dead-Letter Queues (DLQ).
3. **Enterprise Security**: Centralized JWT authentication (15-minute access token, 30-day rotated refresh tokens), server-side Role-Based Access Control (RBAC), signed internal requests (`X-Internal-Token`), and constant-time webhook signature verification.
4. **Strict Monorepo Tooling**: All Node.js and frontend applications strictly utilize **`pnpm`** as the sole package manager. NPM and Yarn lockfiles are rejected.

---

## Key Features & Capabilities

### Customer Experience
- **Catalog & Search**: Full-text keyword search, price range filtering, category tree browsing, and sorting with Redis caching.
- **Cart Management**: Guest cart persistence in browser local storage seamlessly synchronized to backend cart upon authentication.
- **Checkout & Multi-Address**: Address management with default address rules, live order quotes, and multi-step checkout.
- **Order Lifecycle & Tracking**: Real-time order status tracking with complete historical audit trail and transition timestamps.
- **Sandbox Payments**: Integrated payment session flow with 15-minute TTL, sandbox simulation, and webhook callback idempotency.
- **AI Assistant**: Natural-language conversational shopping assistant answering product inquiries, checking order status, and filing customer support tickets via server-side tool calling.

### Administrative Management
- **Catalog Administration**: Product CRUD, slug management, compare-at pricing, image references, and category hierarchy management.
- **Inventory Control**: Atomic stock adjustments, reservation inspection, and sold inventory monitoring.
- **Order Management**: Comprehensive order oversight, state transitions (`PENDING_PAYMENT` → `PAID` → `PROCESSING` → `SHIPPED` → `DELIVERED` / `CANCELLED`), and customer shipping address review.
- **Notification Audit Log**: System-wide delivery history inspection with status filtering (`SENT`, `FAILED`, `PENDING`), provider message IDs, and delivery attempt logs.

---

## Tech Stack

| Domain | Technology / Framework | Version | Package Manager | Purpose |
|---|---|---|---|---|
| **Frontend** | Next.js (App Router), React, TypeScript | 14.2 / 18.3 | **pnpm** | Customer storefront & Admin dashboard |
| **API Gateway** | NestJS, Express, TypeScript | 10.4 | **pnpm** | Reverse proxy, rate limiting, JWT auth, request correlation |
| **Core Commerce** | Go, Chi router, `pgx/v5`, `go-redis/v9` | 1.22+ | Go Modules | Catalog, categories, cart, atomic inventory reservations |
| **Order Service** | Java, Spring Boot 3, Spring Data JPA, Flyway | Java 17/21 | Maven | Order lifecycle state machine, payments, quotes, RabbitMQ events |
| **Notifications** | C#, ASP.NET Core Minimal APIs, EF Core, MailKit | .NET 8.0 | NuGet | Email notification dispatch, HTML templates, delivery audits |
| **AI Assistant** | Python, FastAPI, Pydantic, Structlog | 3.11+ | pip (venv) | LLM orchestration, tool calling against internal APIs, guardrails |
| **Primary Database** | PostgreSQL | 16-alpine | - | Relational persistence with isolated schema-per-service architecture |
| **Cache & Limit** | Redis | 7-alpine | - | Catalog cache-aside, sliding-window rate limiting |
| **Message Broker** | RabbitMQ | 3.13-mgmt | - | Asynchronous event-driven communication, retry queues, and DLQ |
| **Email Sandbox** | MailHog | 1.0.1 | - | Local SMTP server and web interface for inspecting outgoing emails |
| **Monitoring** | Prometheus & Grafana | Latest | - | Metrics scraping, request latency histograms, and dashboards |

---

## Architecture & System Design

MarketForge applies a **Database-Per-Service (Schema-Separated)** model where each service exclusively owns its schema within PostgreSQL. No service directly queries another service's database tables.

```text
                                  ┌──────────────────────────┐
                                  │      Next.js Web App     │
                                  │   (Storefront & Admin)   │
                                  │       Port: 3000         │
                                  └─────────────┬────────────┘
                                                │ REST / Bearer Token
                                                ▼
                                  ┌──────────────────────────┐
                                  │       API Gateway        │
                                  │    (NestJS / Port 8080)  │
                                  └──────┬────────────┬──────┘
                   ┌─────────────────────┼────────────┼─────────────────────┐
                   │                     │            │                     │
                   ▼                     ▼            ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐   │            ┌─────────────────┐
          │   commerce-go   │   │  order-service  │   │            │   ai-service    │
          │   (Go / 8081)   │   │  (Java / 8082)  │   │            │ (Python / 8084) │
          └────────┬────────┘   └────────┬────────┘   │            └────────┬────────┘
                   │                     │            │                     │ (Internal Tools)
                   │                     ├────────────┼─────────────────────┘
                   │                     │            ▼
                   │                     │   ┌──────────────────┐
                   │                     │   │   notification   │
                   │                     │   │   (.NET / 8083)  │
                   │                     │   └────────┬─────────┘
                   │                     │            │
  ┌────────────────┴─────────────────────┴────────────┴──────────────────────────┐
  │                               Shared Infrastructure                          │
  ├───────────────────────┬──────────────────────────────┬───────────────────────┤
  │     PostgreSQL 16     │           Redis 7            │      RabbitMQ 3.13    │
  │  Schemas: commerce,   │   Product cache, sliding     │ Topic exchange, DLQ,  │
  │  orders, payments,    │   window rate limiter        │ order.created,        │
  │  notifications, ai    │                              │ order.paid events     │
  └───────────────────────┴──────────────────────────────┴───────────────────────┘
```

For detailed sequence diagrams, state machines, and design decisions:
- Architecture Deep-Dive: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/architecture/README.md`](./docs/architecture/README.md)
- Architecture Decision Records (ADRs): [`docs/DECISIONS.md`](./docs/DECISIONS.md) and [`docs/decisions/README.md`](./docs/decisions/README.md)

---

## Repository Structure

```text
marketforge/
├── apps/
│   ├── web/                    # Next.js 14 frontend (storefront, admin, AI widget)
│   ├── gateway/                # NestJS API gateway, auth, rate limiter, reverse proxy
│   ├── commerce-go/            # Go commerce service (catalog, inventory, cart)
│   ├── order-service/          # Spring Boot order service & payment orchestration
│   ├── notification-service/   # ASP.NET Core notification engine & template renderer
│   └── ai-service/             # FastAPI AI assistant service & tool caller
├── infrastructure/
│   ├── docker/postgres/init/   # PostgreSQL init scripts (schema creation & extensions)
│   ├── grafana/                # Grafana datasources & dashboard provisioning
│   ├── nginx/                  # Optional edge reverse proxy configuration
│   ├── prometheus/             # Prometheus metric scrape definitions
│   └── rabbitmq/               # RabbitMQ queue, exchange, and binding definitions
├── docs/                       # Comprehensive technical documentation & guides
│   ├── API.md                  # Authoritative API contract & endpoint specification
│   ├── ARCHITECTURE.md         # System boundaries, data ownership, & state machines
│   ├── DATABASE.md             # Schema definitions, ERD, and indexing strategy
│   ├── DEPLOYMENT.md           # Production deployment topologies & CI/CD guides
│   ├── OBSERVABILITY.md        # Logging standards, metrics, and health probes
│   ├── api/                    # Frontend integration guide & communication sequences
│   ├── architecture/           # Deep-dive flow diagrams & checkout transaction logic
│   ├── database/               # SQL migrations, seed details, & query performance
│   ├── decisions/              # Architecture Decision Records (ADR 001 - 010)
│   ├── learning/               # Engineering learning tracker across polyglot stacks
│   ├── operations/             # Production & local operations runbook
│   └── security/               # Security guidelines, JWT lifecycle, & RBAC rules
├── scripts/
│   ├── migrations/             # SQL migrations partitioned by service schema
│   │   ├── commerce/           # V1__init.sql (users, products, inventory, cart)
│   │   ├── payments/           # V1__init.sql (payments, webhooks, idempotency)
│   │   ├── notifications/      # V1__init.sql (notifications, delivery attempts)
│   │   └── ai/                 # V1__init.sql (support tickets & conversation logs)
│   ├── seed/                   # Seed dataset (demo users, categories, 56 products)
│   ├── migrate.sh              # Unified migration runner (Git Bash / Linux)
│   ├── seed.sh                 # Database seed execution script (Git Bash / Linux)
│   ├── test.sh                 # Multi-service test suite runner
│   └── lint.sh                 # Monorepo linting suite
├── docker-compose.yml          # Full multi-container composition
├── Makefile                    # Developer task runner
├── SECURITY.md                 # Threat model & security disclosures
└── .env.example                # Canonical environment variable contract
```

---

## Service Directory & Ports

| Service | Internal URL | Host Exposed URL | Documentation / Health Check |
|---|---|---|---|
| **Web Storefront** | `http://web:3000` | `http://localhost:3000` | Web UI (Customer & Admin) |
| **API Gateway** | `http://gateway:3000` | `http://localhost:8080` | `http://localhost:8080/health` |
| **Commerce Go** | `http://commerce-go:8080` | `http://localhost:8081` | `http://localhost:8081/health` |
| **Order Service** | `http://order-service:8080` | `http://localhost:8082` | `http://localhost:8082/actuator/health` |
| **Notification Service** | `http://notification-service:8080` | `http://localhost:8083` | `http://localhost:8083/health` & `/swagger` |
| **AI Assistant** | `http://ai-service:8000` | `http://localhost:8084` | `http://localhost:8084/health` & `/docs` |
| **PostgreSQL** | `postgres:5432` | `localhost:5432` | Port 5432 (`marketforge`/`marketforge`) |
| **Redis** | `redis:6379` | `localhost:6379` | Port 6379 |
| **RabbitMQ Management**| `rabbitmq:15672` | `http://localhost:15672` | User: `marketforge` / Pass: `marketforge` |
| **MailHog Web UI** | `mailhog:8025` | `http://localhost:8025` | Outgoing email sandbox |
| **Prometheus** | `prometheus:9090` | `http://localhost:9090` | Metrics scraper |
| **Grafana** | `grafana:3000` | `http://localhost:3001` | User: `admin` / Pass: `admin` |

---

## Prerequisites & Toolchain

### Package Manager Requirement: PNPM
MarketForge requires **`pnpm`** (v9 or v10+) for managing frontend and Node.js dependencies. Do not use `npm` or `yarn`.

Enable pnpm via Corepack or standalone installer:
```bash
# Enable via Node.js Corepack:
corepack enable
corepack prepare pnpm@latest --activate

# Verify pnpm:
pnpm --version
```

### Toolchain Matrix
| Component | Required Version | Verification Command |
|---|---|---|
| **Node.js** | v20.x or v22.x LTS | `node -v` |
| **pnpm** | v9.x or v10+ | `pnpm -v` |
| **Go** | v1.22+ | `go version` |
| **Java** | JDK 17 or 21 | `java -version` |
| **Maven** | v3.9+ | `mvn -version` |
| **Python** | v3.11+ | `python --version` |
| **.NET SDK** (for local notif) | v8.0+ | `dotnet --version` |
| **Docker & Compose** | Docker v24+, Compose v2.20+ | `docker compose version` |

---

## Environment Configuration

MarketForge utilizes a centralized configuration file at the repository root.

1. Copy the example environment file:
   ```bash
   # Git Bash / Linux / macOS
   cp .env.example .env

   # Windows PowerShell
   Copy-Item .env.example .env
   ```

2. Review the default values in `.env`. Key parameters:

| Variable | Default Value | Description |
|---|---|---|
| `POSTGRES_USER` | `marketforge` | PostgreSQL database user |
| `POSTGRES_PASSWORD` | `marketforge` | PostgreSQL database password |
| `POSTGRES_DB` | `marketforge` | Primary database name |
| `DATABASE_URL` | `postgres://marketforge:marketforge@postgres:5432/marketforge` | Connection string for containers |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL |
| `RABBITMQ_URL` | `amqp://marketforge:marketforge@rabbitmq:5672/` | RabbitMQ connection string |
| `INTERNAL_SERVICE_TOKEN`| `dev-internal-token-change-me` | Secret token verifying internal requests |
| `JWT_ACCESS_SECRET` | `change-me-access-secret-min-32-chars-long` | 32+ character HMAC secret for Access JWT |
| `JWT_REFRESH_SECRET` | `change-me-refresh-secret-min-32-chars` | 32+ character HMAC secret for Refresh JWT |
| `PAYMENT_PROVIDER` | `mock` | `mock` for local sandbox simulation |
| `PAYMENT_SIMULATION_ENABLED` | `true` | Allows one-click simulation of successful payments |

---

## Quickstart: Full Docker Compose

The fastest way to spin up the complete MarketForge platform is with Docker Compose:

```bash
# 1. Clone repository
git clone <repo-url> marketforge
cd marketforge

# 2. Setup environment
cp .env.example .env

# 3. Start all containers (infrastructure + 5 backends + web frontend)
docker compose up -d --build

# 4. Run database migrations and seed data
# On Git Bash / Linux / macOS:
make migrate
make seed

# On Windows PowerShell:
Get-Content scripts\migrations\commerce\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\payments\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\notifications\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\ai\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\seed\seed.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
```

Once running, verify that all services report healthy:
```bash
docker compose ps
```

Open your browser:
- **MarketForge Storefront & Admin**: [http://localhost:3000](http://localhost:3000)
- **MailHog Email Inbox**: [http://localhost:8025](http://localhost:8025)
- **RabbitMQ Dashboard**: [http://localhost:15672](http://localhost:15672) (`marketforge`/`marketforge`)
- **Grafana Observability**: [http://localhost:3001](http://localhost:3001) (`admin`/`admin`)

---

## Local Development (Hybrid / Native Mode)

If you prefer hot-reloading code locally while running supporting infrastructure in Docker:

### 1. Start Infrastructure Only
```bash
docker compose up -d postgres redis rabbitmq mailhog
```

### 2. Configure Local Database Connection
In `.env`, point the database and broker hosts to `localhost`:
```env
POSTGRES_HOST=localhost
DATABASE_URL=postgres://marketforge:marketforge@localhost:5432/marketforge
REDIS_HOST=localhost
REDIS_URL=redis://localhost:6379/0
RABBITMQ_HOST=localhost
RABBITMQ_URL=amqp://marketforge:marketforge@localhost:5672/
COMMERCE_GO_URL=http://localhost:8081
ORDER_SERVICE_URL=http://localhost:8082
NOTIFICATION_SERVICE_URL=http://localhost:8083
AI_SERVICE_URL=http://localhost:8084
GATEWAY_URL=http://localhost:8080
```

---

### Windows PowerShell Guide

Open separate PowerShell windows for each service:

#### API Gateway (NestJS with pnpm)
```powershell
cd apps\gateway
pnpm install
pnpm run start:dev
# Serves on http://localhost:8080
```

#### Core Commerce Service (Go)
```powershell
cd apps\commerce-go
go run ./cmd/server
# Serves on http://localhost:8081
```

#### Order Service (Spring Boot / Maven)
```powershell
cd apps\order-service
mvn spring-boot:run
# Serves on http://localhost:8082
```

#### Notification Service (ASP.NET Core)
```powershell
cd apps\notification-service
dotnet run
# Serves on http://localhost:8083
```

#### AI Assistant Service (FastAPI)
```powershell
cd apps\ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Serves on http://localhost:8000
```

#### Web Frontend (Next.js 14 with pnpm)
```powershell
cd apps\web
pnpm install
pnpm run dev
# Serves on http://localhost:3000
```

---

### Git Bash / Linux Guide

#### API Gateway (NestJS with pnpm)
```bash
cd apps/gateway && pnpm install && pnpm run start:dev
```

#### Core Commerce Service (Go)
```bash
cd apps/commerce-go && go run ./cmd/server
```

#### Order Service (Spring Boot / Maven)
```bash
cd apps/order-service && mvn spring-boot:run
```

#### Notification Service (ASP.NET Core)
```bash
cd apps/notification-service && dotnet run
```

#### AI Assistant Service (FastAPI)
```bash
cd apps/ai-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Web Frontend (Next.js 14 with pnpm)
```bash
cd apps/web && pnpm install && pnpm run dev
```

---

## Database Migrations & Seed Data

### Migrations
MarketForge executes migrations sequentially across 5 service schemas:
1. `commerce`: Tables for `users`, `addresses`, `categories`, `products`, `product_images`, `inventory`, `reservations`, `carts`, `cart_items`.
2. `orders`: Order entity, line items snapshot, status state machine audit history (`order_history`).
3. `payments`: Payment records, webhook events, idempotency keys.
4. `notifications`: Notification dispatch records, delivery attempt audits.
5. `ai`: Customer support tickets and conversation logs.

#### Execution on Windows PowerShell
```powershell
Get-Content scripts\migrations\commerce\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\payments\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\notifications\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\ai\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
```

#### Execution on Git Bash / Linux
```bash
make migrate
# Or:
bash ./scripts/migrate.sh
```

*(Note: `order-service` automatically executes its internal Flyway migrations `V1__orders.sql` and `V2__payments.sql` for the `orders` and `payments` schemas on startup).*

### Seed Data
The database seed script populates 56 products across 5 active categories, default inventory stocks, default demo customer address, and predefined admin/customer accounts.

#### Execution on Windows PowerShell
```powershell
Get-Content scripts\seed\seed.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
```

#### Execution on Git Bash / Linux
```bash
make seed
# Or:
bash ./scripts/seed.sh
```

---

## Demo Accounts

Pre-seeded accounts are provided for immediate testing. On the `/login` page, click the quick-fill buttons or use the credentials below:

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **Admin** | `admin@marketforge.local` | `Admin123!` | Access to `/admin`, product management, stock adjustment, category CRUD, order state transitions, and notification logs. |
| **Customer** | `customer@marketforge.local` | `Customer123!` | Browsing catalog, shopping cart, checkout, saved address management, order tracking, and AI assistant inquiries. |

*Self-registration is also supported at `/register` for creating additional customer accounts.*

---

## Testing & Validation

### Automated Monorepo Test Runner
The root test script automatically detects installed toolchains and executes test suites:
```bash
# Git Bash / Linux
bash ./scripts/test.sh
```

### Service-Specific Test & Build Commands
- **Web Frontend Build (pnpm)**:
  ```bash
  cd apps/web && pnpm build
  ```
- **API Gateway Tests & Build (pnpm)**:
  ```bash
  cd apps/gateway && pnpm build && pnpm test
  ```
- **Go Commerce Unit & Concurrency Tests**:
  ```bash
  cd apps/commerce-go && go test -v ./...
  ```
- **Spring Boot Order Service Tests**:
  ```bash
  cd apps/order-service && mvn test
  ```
- **Notification Service Build**:
  ```bash
  cd apps/notification-service && dotnet build
  ```
- **AI Service Sanity Check**:
  ```bash
  cd apps/ai-service && python -c "from app.main import app; print('AI Service valid')"
  ```

---

## Observability & Monitoring

MarketForge incorporates unified structured JSON logging, standard health check endpoints, and Prometheus metrics across all services:

1. **Structured Logs**: Every service logs structured JSON to stdout containing timestamp, log level, service name, message, and the propagated `X-Request-Id`.
2. **Health Probes**:
   - `GET /health` (Liveness): Validates that the application process is running.
   - `GET /ready` (Readiness): Validates active connectivity to PostgreSQL, Redis, and RabbitMQ.
3. **Prometheus Metrics**:
   - Metrics are scraped from downstream services by Prometheus at `http://localhost:9090`.
   - Grafana dashboards are pre-provisioned at `http://localhost:3001` (login with `admin`/`admin`).

---

## Troubleshooting

### 1. Port Conflicts (Address already in use)
- **Symptom**: Docker fails with `bind: address already in use` for ports `5432`, `6379`, `3000`, or `8080`.
- **Solution**: Stop locally running PostgreSQL (`net stop postgresql` on Windows or `systemctl stop postgresql` on Linux) or Redis instances. Alternatively, override conflicting host ports in your `.env` file (e.g. `POSTGRES_PORT=5433`).

### 2. Next.js CSR Bail-out / Suspense Warnings
- **Symptom**: Build warnings regarding `useSearchParams()` outside a Suspense boundary.
- **Solution**: Dynamic pages utilizing search queries (`/login`, `/register`, `/assistant`) are wrapped in `<Suspense fallback={<StatusNotice />}>`. Ensure custom pages follow this pattern.

### 3. Payment Simulation Not Progressing Order
- **Symptom**: Clicking simulate payment does not mark order as `PAID`.
- **Solution**: Ensure `PAYMENT_SIMULATION_ENABLED=true` in `.env` and `order-service` has connectivity to `commerce-go` to confirm the inventory reservation.

### 4. Database Schema Not Found
- **Symptom**: `relation "commerce.products" does not exist`.
- **Solution**: The initial database volume may have initialized before `01-schemas.sql` ran. Run the migration scripts via PowerShell or Git Bash to populate the schemas.

### 5. RabbitMQ Consumer Connection Delay
- **Symptom**: Services restart during initial boot with RabbitMQ connection errors.
- **Solution**: Standard Docker healthchecks delay service startup until RabbitMQ diagnostics report healthy. Give `order-service` and `notification-service` up to 30 seconds to finish connection retries.

---

## Documentation Index

Explore the comprehensive guides located in the `docs/` folder:

- 📖 **API Specifications**:
  - [`docs/API.md`](./docs/API.md) — Authoritative endpoint contract, headers, and error formats.
  - [`docs/api/README.md`](./docs/api/README.md) — Frontend integration guide, request life cycles, and sequences.
- 🏛️ **Architecture & Design**:
  - [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Service boundaries, data ownership, and order state machine.
  - [`docs/architecture/README.md`](./docs/architecture/README.md) — Deep-dive sequence diagrams (checkout, payments, notifications).
  - [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Architecture Decision Records (ADR 001 - 010).
  - [`docs/decisions/README.md`](./docs/decisions/README.md) — ADR index, rationale, and technology trade-offs.
- 🗄️ **Database & Persistence**:
  - [`docs/DATABASE.md`](./docs/DATABASE.md) — PostgreSQL schema definitions, ERD, and tables.
  - [`docs/database/README.md`](./docs/database/README.md) — Migrations guide, indexing strategy, and seed data.
- 🔒 **Security & Identity**:
  - [`SECURITY.md`](./SECURITY.md) — Threat model, trust boundaries, and attack surface mitigations.
  - [`docs/security/README.md`](./docs/security/README.md) — Security guidelines, JWT lifecycle, RBAC rules, and internal tokens.
- ⚙️ **Operations & Runbooks**:
  - [`docs/operations/README.md`](./docs/operations/README.md) — Operator runbook, local commands, and incident mitigation.
  - [`docs/OBSERVABILITY.md`](./docs/OBSERVABILITY.md) — JSON logs, metrics dictionary, and Prometheus scrapers.
  - [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Container topology, environments, and CI/CD pipelines.
- 🎓 **Learning & Engineering**:
  - [`docs/LEARNING.md`](./docs/LEARNING.md) and [`docs/learning/README.md`](./docs/learning/README.md) — Technical skills tracker across polyglot microservices.

---

## License

This project is open-source under the MIT License. MarketForge is developed for educational and portfolio demonstration purposes.
