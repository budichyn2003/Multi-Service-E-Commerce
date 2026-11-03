# MarketForge — Operations & Runbook

This runbook covers day-to-day operations, local environments, service monitoring, background workers, and incident resolution for MarketForge across both **Windows PowerShell** and **Git Bash / Linux** environments.

---

## 1. Package Manager Standard: PNPM

All Node.js applications (`apps/web` and `apps/gateway`) strictly require **`pnpm`**. NPM and Yarn are not used.

```bash
# Enable pnpm via Node.js Corepack:
corepack enable
corepack prepare pnpm@latest --activate

# Verify version:
pnpm --version
```

---

## 2. Service Management & Run Modes

### Mode A: Full Docker Compose (Recommended for Complete System Testing)

Starts all supporting infrastructure and 6 application containers.

```bash
# Start all containers in the background
docker compose up -d

# Start with image rebuild
docker compose up -d --build

# Inspect running containers and health status
docker compose ps

# Tail logs across all services
docker compose logs -f --tail=100

# Tail logs for a specific service
docker compose logs -f gateway
docker compose logs -f order-service

# Stop all containers
docker compose down

# Stop containers and destroy data volumes (CAUTION)
docker compose down -v
```

---

### Mode B: Hybrid Local Development

Run supporting infrastructure in Docker and run application code natively for fast iteration and debugging.

#### 1. Start Infrastructure Only
```bash
docker compose up -d postgres redis rabbitmq mailhog
```

#### 2. Running Services Locally

#### Windows PowerShell Commands

| Service | Working Directory | Command | Default Port |
|---|---|---|---|
| **API Gateway** | `apps\gateway` | `pnpm install; pnpm run start:dev` | `http://localhost:8080` |
| **Web Storefront** | `apps\web` | `pnpm install; pnpm run dev` | `http://localhost:3000` |
| **Commerce Go** | `apps\commerce-go` | `go run .\cmd\server` | `http://localhost:8081` |
| **Order Service** | `apps\order-service` | `mvn spring-boot:run` | `http://localhost:8082` |
| **Notification Service** | `apps\notification-service` | `dotnet run` | `http://localhost:8083` |
| **AI Assistant** | `apps\ai-service` | `python -m venv .venv; .venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn app.main:app --reload --port 8000` | `http://localhost:8000` |

#### Git Bash / Linux Commands

| Service | Working Directory | Command | Default Port |
|---|---|---|---|
| **API Gateway** | `apps/gateway` | `pnpm install && pnpm run start:dev` | `http://localhost:8080` |
| **Web Storefront** | `apps/web` | `pnpm install && pnpm run dev` | `http://localhost:3000` |
| **Commerce Go** | `apps/commerce-go` | `go run ./cmd/server` | `http://localhost:8081` |
| **Order Service** | `apps/order-service` | `mvn spring-boot:run` | `http://localhost:8082` |
| **Notification Service** | `apps/notification-service` | `dotnet run` | `http://localhost:8083` |
| **AI Assistant** | `apps/ai-service` | `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000` | `http://localhost:8000` |

---

## 3. Database Administration & Migrations

### Interactive Database Shells
```bash
# Open interactive psql shell inside postgres container
docker compose exec postgres psql -U marketforge -d marketforge

# Open interactive redis-cli shell inside redis container
docker compose exec redis redis-cli
```

### Applying Migrations

#### Windows PowerShell
```powershell
Get-Content scripts\migrations\commerce\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\payments\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\notifications\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\ai\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
```

#### Git Bash / Linux
```bash
make migrate
# Or:
bash ./scripts/migrate.sh
```

### Seeding Demo Data

#### Windows PowerShell
```powershell
Get-Content scripts\seed\seed.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
```

#### Git Bash / Linux
```bash
make seed
# Or:
bash ./scripts/seed.sh
```

---

## 4. Testing & Validation Commands

- **Web Frontend Build**:
  ```bash
  cd apps/web && pnpm build
  ```
- **API Gateway Unit Tests**:
  ```bash
  cd apps/gateway && pnpm test
  ```
- **Go Commerce Tests**:
  ```bash
  cd apps/commerce-go && go test -v ./...
  ```
- **Order Service Tests**:
  ```bash
  cd apps/order-service && mvn test
  ```
- **Notification Service Build**:
  ```bash
  cd apps/notification-service && dotnet build
  ```

---

## 5. Health Checks & Probes

| Target | Liveness Probe | Readiness Probe | Expected Status |
|---|---|---|---|
| **Gateway** | `GET http://localhost:8080/health` | - | HTTP 200 `{"status":"ok"}` |
| **Commerce Go** | `GET http://localhost:8081/health` | `GET http://localhost:8081/ready` | HTTP 200 `{"status":"ok"}` |
| **Order Service** | `GET http://localhost:8082/actuator/health` | `GET http://localhost:8082/actuator/health/readiness` | HTTP 200 `{"status":"UP"}` |
| **Notification Service** | `GET http://localhost:8083/health` | `GET http://localhost:8083/ready` | HTTP 200 `{"status":"ok"}` |
| **AI Service** | `GET http://localhost:8084/health` | - | HTTP 200 `{"status":"ok"}` |

---

## 6. Message Broker & Event Processing

### RabbitMQ Topology (`infrastructure/rabbitmq/definitions.json`)
* **Topic Exchange**: `marketforge.events`
* **Exchanges & Queues**:
  - `orders.created` → bound to `marketforge.events` with routing key `order.created`
  - `orders.paid` → bound to `marketforge.events` with routing key `order.paid`
  - `notifications.email` → queue for notification worker
* **Dead-Letter Queue (DLQ)**:
  - DLX: `marketforge.dlx`
  - DLQ: `notifications.email.dlq`
  - Messages that fail delivery after 3 retry attempts are rejected with `x-dead-letter-exchange` and captured in the DLQ for operator inspection.

### Inspecting Messages in RabbitMQ
Open the web interface at [http://localhost:15672](http://localhost:15672) (User: `marketforge` / Password: `marketforge`).
1. Navigate to the **Queues** tab.
2. Inspect queue depths and consumer activity.
3. Check `notifications.email.dlq` for failed message payloads.

---

## 7. Troubleshooting & Incident Runbooks

### Incident 1: "Address already in use" on startup
* **Root Cause**: A local service (e.g. system PostgreSQL or existing Node instance) is holding port `5432`, `6379`, `8080`, or `3000`.
* **Resolution**:
  - Windows: Find PID: `netstat -ano | findstr :5432` then kill task: `taskkill /PID <PID> /F`.
  - Linux/macOS: `lsof -i :5432` then kill: `kill -9 <PID>`.
  - Or override host ports in `.env` (e.g., `POSTGRES_PORT=5433`).

### Incident 2: Products return 404 or empty list
* **Root Cause**: Database was not seeded or Redis contains stale empty cache.
* **Resolution**:
  1. Re-run migrations and seeds.
  2. Flush Redis cache: `docker compose exec redis redis-cli flushall`.

### Incident 3: Authentication failure with 401 UNAUTHORIZED on Admin pages
* **Root Cause**: Token expired or user lacks the `ADMIN` role.
* **Resolution**:
  1. Login with demo admin account: `admin@marketforge.local` / `Admin123!`.
  2. Verify user record in database:
     ```sql
     SELECT id, email, role, status FROM commerce.users WHERE email = 'admin@marketforge.local';
     ```
  3. Ensure role is `ADMIN` and status is `ACTIVE`.

### Incident 4: Payment Simulation does not update order
* **Root Cause**: `PAYMENT_SIMULATION_ENABLED` is set to `false` or `order-service` cannot reach `commerce-go` to confirm reservation.
* **Resolution**:
  1. Ensure `PAYMENT_SIMULATION_ENABLED=true` in `.env`.
  2. Check container logs: `docker compose logs order-service`.
  3. Verify network reachability from `order-service` to `commerce-go:8080`.
