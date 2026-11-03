# MarketForge — Database Architecture & Migrations

MarketForge uses a single PostgreSQL 16 database instance logically partitioned into **isolated schemas per microservice**. This guarantees strict domain encapsulation while maintaining simplified operations during local development and testing.

---

## 1. Schema Ownership

| Schema | Owning Service | Stack | Primary Entities |
|---|---|---|---|
| `commerce` | `apps/commerce-go` | Go / pgx | `users`, `addresses`, `categories`, `products`, `product_images`, `inventory`, `reservations`, `carts`, `cart_items` |
| `orders` | `apps/order-service` | Java / Spring Data JPA | `orders`, `order_items`, `order_history` |
| `payments` | `apps/order-service` | Java / Spring Data JPA | `payments`, `webhook_events`, `idempotency_keys` |
| `notifications` | `apps/notification-service` | C# / EF Core | `notifications`, `templates`, `delivery_attempts` |
| `ai` | `apps/ai-service` | Python / SQLAlchemy | `support_tickets`, `conversations`, `messages`, `embeddings` |

**Rule**: Direct SQL queries or foreign keys between schemas are strictly prohibited. Inter-service data sharing occurs via REST APIs or RabbitMQ events.

---

## 2. Table Specifications

### 2.1 `commerce` Schema

#### `commerce.users`
* `id` (`UUID`, PK, default `gen_random_uuid()`)
* `name` (`VARCHAR(120)`, NOT NULL)
* `email` (`CITEXT`, UNIQUE, NOT NULL) — Case-insensitive normalized email
* `password_hash` (`TEXT`, NOT NULL) — Stored using bcrypt / Argon2id
* `role` (`VARCHAR(20)`, NOT NULL) — `CUSTOMER` or `ADMIN`
* `status` (`VARCHAR(20)`, NOT NULL) — `ACTIVE`, `SUSPENDED`, or `DISABLED`
* `oauth_provider` (`VARCHAR(30)`, NULL)
* `oauth_subject` (`VARCHAR(255)`, NULL)
* `last_login_at` (`TIMESTAMPTZ`, NULL)
* `created_at` / `updated_at` (`TIMESTAMPTZ`, NOT NULL, default `NOW()`)

#### `commerce.addresses`
* `id` (`UUID`, PK)
* `user_id` (`UUID`, FK → `commerce.users(id) ON DELETE CASCADE`)
* `label` (`VARCHAR(50)`, e.g., 'Home', 'Office')
* `recipient_name` (`VARCHAR(120)`, NOT NULL)
* `phone` (`VARCHAR(30)`, NOT NULL)
* `address_line` (`TEXT`, NOT NULL)
* `city`, `province`, `postal_code`, `country` (`VARCHAR`, NOT NULL)
* `is_default` (`BOOLEAN`, NOT NULL, default `false`)
* **Index**: Partial unique index `UNIQUE (user_id) WHERE (is_default = true)` ensuring at most one default address per customer.

#### `commerce.categories`
* `id` (`UUID`, PK)
* `name` (`VARCHAR(100)`, NOT NULL)
* `slug` (`VARCHAR(120)`, UNIQUE, NOT NULL)
* `parent_id` (`UUID`, NULL, FK → `commerce.categories(id)`) — Self-referential for hierarchical trees
* `status` (`VARCHAR(20)`, default `'ACTIVE'`)

#### `commerce.products`
* `id` (`UUID`, PK)
* `sku` (`VARCHAR(64)`, UNIQUE, NOT NULL)
* `slug` (`VARCHAR(180)`, UNIQUE, NOT NULL)
* `name` (`VARCHAR(255)`, NOT NULL)
* `description` (`TEXT`)
* `price` (`NUMERIC(12,2)`, CHECK `price >= 0`)
* `compare_at_price` (`NUMERIC(12,2)`, NULL)
* `category_id` (`UUID`, FK → `commerce.categories(id)`)
* `status` (`VARCHAR(20)`, default `'ACTIVE'`) — `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`
* `weight_grams` (`INT`, NULL)

#### `commerce.inventory`
* `id` (`UUID`, PK)
* `product_id` (`UUID`, UNIQUE, FK → `commerce.products(id) ON DELETE CASCADE`)
* `available_quantity` (`INT`, NOT NULL, CHECK `>= 0`)
* `reserved_quantity` (`INT`, NOT NULL, CHECK `>= 0`)
* `sold_quantity` (`INT`, NOT NULL, default `0`)

#### `commerce.reservations`
* `id` (`UUID`, PK)
* `order_id` (`UUID`, NOT NULL)
* `product_id` (`UUID`, NOT NULL, FK → `commerce.products(id)`)
* `quantity` (`INT`, NOT NULL, CHECK `> 0`)
* `status` (`VARCHAR(20)`, NOT NULL) — `ACTIVE`, `RELEASED`, `CONFIRMED`, `EXPIRED`
* `expires_at` (`TIMESTAMPTZ`, NOT NULL)

#### `commerce.carts` & `commerce.cart_items`
* `carts`: `id` (PK), `user_id` (UNIQUE, FK → `commerce.users`), `updated_at`
* `cart_items`: `id` (PK), `cart_id` (FK), `product_id` (FK), `quantity` (`INT` > 0), `created_at`

---

### 2.2 `orders` Schema

#### `orders.orders`
* `id` (`UUID`, PK)
* `order_number` (`VARCHAR(32)`, UNIQUE, NOT NULL) — Formatted as `ORD-YYYYMMDD-XXXX`
* `user_id` (`UUID`, NOT NULL)
* `status` (`VARCHAR(32)`, NOT NULL) — `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `EXPIRED`
* `subtotal` (`NUMERIC(14,2)`, NOT NULL)
* `shipping_amount` (`NUMERIC(14,2)`, NOT NULL)
* `discount_amount` (`NUMERIC(14,2)`, NOT NULL default `0`)
* `total_amount` (`NUMERIC(14,2)`, NOT NULL)
* `currency` (`VARCHAR(3)`, default `'IDR'`)
* `shipping_address_json` (`TEXT`, NOT NULL) — Frozen snapshot of the delivery address
* `created_at` / `updated_at` (`TIMESTAMPTZ`, default `NOW()`)

#### `orders.order_items`
* `id` (`UUID`, PK)
* `order_id` (`UUID`, NOT NULL, FK → `orders.orders(id)`)
* `product_id` (`UUID`, NOT NULL)
* `product_name` (`VARCHAR(255)`, NOT NULL) — Frozen snapshot
* `sku` (`VARCHAR(64)`, NOT NULL)
* `price` (`NUMERIC(14,2)`, NOT NULL) — Frozen snapshot
* `quantity` (`INT`, NOT NULL)
* `total_price` (`NUMERIC(14,2)`, NOT NULL)

#### `orders.order_history`
* `id` (`UUID`, PK)
* `order_id` (`UUID`, NOT NULL, FK → `orders.orders(id)`)
* `from_status` (`VARCHAR(32)`, NULL)
* `to_status` (`VARCHAR(32)`, NOT NULL)
* `reason` (`VARCHAR(255)`, NULL)
* `actor_type` (`VARCHAR(32)`, NOT NULL) — `CUSTOMER`, `ADMIN`, `SYSTEM`, `WEBHOOK`
* `created_at` (`TIMESTAMPTZ`, default `NOW()`)

---

### 2.3 `payments` Schema

#### `payments.payments`
* `id` (`UUID`, PK)
* `order_id` (`UUID`, NOT NULL)
* `order_number` (`VARCHAR(32)`, NOT NULL)
* `external_payment_id` (`VARCHAR(128)`, NULL)
* `amount` (`NUMERIC(14,2)`, NOT NULL)
* `currency` (`VARCHAR(3)`, default `'IDR'`)
* `status` (`VARCHAR(32)`, NOT NULL) — `PENDING`, `SUCCESS`, `FAILED`, `EXPIRED`
* `checkout_url` (`VARCHAR(512)`, NULL)
* `expires_at` (`TIMESTAMPTZ`, NOT NULL)

#### `payments.webhook_events`
* `id` (`UUID`, PK)
* `provider` (`VARCHAR(64)`, NOT NULL)
* `external_event_id` (`VARCHAR(128)`, NOT NULL, UNIQUE) — Used for replay detection
* `event_type` (`VARCHAR(64)`, NOT NULL)
* `payload_json` (`TEXT`, NOT NULL)
* `status` (`VARCHAR(32)`, NOT NULL)
* `created_at` (`TIMESTAMPTZ`, default `NOW()`)

---

### 2.4 `notifications` Schema

#### `notifications.notifications`
* `id` (`UUID`, PK)
* `user_id` (`UUID`, NULL)
* `order_id` (`UUID`, NULL)
* `channel` (`VARCHAR(32)`, default `'EMAIL'`)
* `template` (`VARCHAR(64)`, NOT NULL)
* `recipient` (`VARCHAR(255)`, NOT NULL)
* `subject` (`VARCHAR(255)`, NOT NULL)
* `body` (`TEXT`, NOT NULL)
* `status` (`VARCHAR(32)`, NOT NULL) — `PENDING`, `SENT`, `FAILED`
* `retry_count` (`INT`, default `0`)
* `provider_message_id` (`VARCHAR(128)`, NULL)
* `sent_at` (`TIMESTAMPTZ`, NULL)

#### `notifications.delivery_attempts`
* `id` (`UUID`, PK)
* `notification_id` (`UUID`, FK → `notifications.notifications(id)`)
* `attempt_no` (`INT`, NOT NULL)
* `outcome` (`VARCHAR(32)`, NOT NULL)
* `error_detail` (`TEXT`, NULL)
* `attempted_at` (`TIMESTAMPTZ`, default `NOW()`)

---

### 2.5 `ai` Schema

#### `ai.support_tickets`
* `id` (`UUID`, PK)
* `user_id` (`VARCHAR(64)`, NOT NULL)
* `order_number` (`VARCHAR(64)`, NULL)
* `subject` (`VARCHAR(255)`, NOT NULL)
* `description` (`TEXT`, NOT NULL)
* `status` (`VARCHAR(32)`, default `'OPEN'`)
* `created_at` (`TIMESTAMPTZ`, default `NOW()`)

---

## 3. PostgreSQL Extensions

Configured in `infrastructure/docker/postgres/init/01-schemas.sql`:
* `citext`: Case-insensitive text type for user email fields (`commerce.users.email`).
* `pg_trgm`: Trigram matching for fast text search and fuzzy lookups on product names and descriptions.
* `pgcrypto`: Cryptographic hashing utilities and UUID generation.
* `vector`: Optional pgvector extension for embedding storage.

---

## 4. Migration Execution

### Initial Schema Creation
The PostgreSQL container automatically runs `infrastructure/docker/postgres/init/01-schemas.sql` on its initial initialization.

### Running Migrations

#### Windows PowerShell
```powershell
Get-Content scripts\migrations\commerce\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\payments\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\notifications\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
Get-Content scripts\migrations\ai\V1__init.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
```

#### Git Bash / Linux / macOS
```bash
# Using Makefile
make migrate

# Or directly:
docker compose exec -T postgres psql -U marketforge -d marketforge < scripts/migrations/commerce/V1__init.sql
docker compose exec -T postgres psql -U marketforge -d marketforge < scripts/migrations/payments/V1__init.sql
docker compose exec -T postgres psql -U marketforge -d marketforge < scripts/migrations/notifications/V1__init.sql
docker compose exec -T postgres psql -U marketforge -d marketforge < scripts/migrations/ai/V1__init.sql
```

`order-service` executes its own Flyway migrations on startup for `orders` and `payments` schemas:
- `apps/order-service/src/main/resources/db/migration/V1__orders.sql`
- `apps/order-service/src/main/resources/db/migration/V2__payments.sql`

---

## 5. Seed Dataset

The seed file `scripts/seed/seed.sql` provides:
1. **Admin User**: `admin@marketforge.local` / `Admin123!`
2. **Customer User**: `customer@marketforge.local` / `Customer123!`
3. **Categories**: Electronics (`laptop`, `smartphone`, `accessories`), Fashion, Home & Living.
4. **56 Products**: Generated products (`SKU-0001` through `SKU-0056`) with realistic price ranges, inventory stocks, weights, and categories.
5. **Customer Address**: Pre-configured default shipping address in Jakarta Selatan.

To apply seed data:

#### Windows PowerShell
```powershell
Get-Content scripts\seed\seed.sql | docker compose exec -T postgres psql -U marketforge -d marketforge
```

#### Git Bash / Linux / macOS
```bash
make seed
# Or:
docker compose exec -T postgres psql -U marketforge -d marketforge < scripts/seed/seed.sql
```
