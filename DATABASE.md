# MarketForge — Database Design

## Instance & Schemas

One PostgreSQL 16 instance during the learning phase. **Each service owns its
schema**; no service queries another schema directly.

```text
marketforge (database)
├── commerce        → commerce-go (users, catalog, inventory, cart)
├── orders          → order-service
├── payments        → order-service
├── notifications   → notification-service
└── ai              → ai-service
```

Schemas are created by `infrastructure/docker/postgres/init/01-schemas.sql`
and migrated by `scripts/migrate.sh`.

## Entity Relationship Overview

```text
users 1──* addresses
users 1──1 carts 1──* cart_items ──1 products
categories 1──* products (self-referencing parent_id for hierarchy)
products 1──1 inventory
products 1──* product_images
products 1──* reservations
users 1──* orders 1──* order_items
orders 1──* order_history
orders 1──* payments
payments 1──* webhook_events (by external_payment_id)
users 1──* notifications
```

## commerce schema

### users
```text
id             uuid pk
name           varchar(120) not null
email          citext unique not null        -- normalized, case-insensitive
password_hash  text not null                 -- argon2id
role           varchar(20) not null          -- CUSTOMER | ADMIN
status         varchar(20) not null          -- ACTIVE | SUSPENDED | DISABLED
oauth_provider varchar(30) null              -- google | null
oauth_subject  varchar(255) null             -- provider user id
last_login_at  timestamptz null
created_at     timestamptz not null default now()
updated_at     timestamptz not null default now()
```

### addresses
```text
id uuid pk, user_id fk → users, label, recipient_name, phone,
address_line, city, province, postal_code, country,
is_default boolean, created_at, updated_at
```
Partial unique index: one default per user
`CREATE UNIQUE INDEX ... ON addresses (user_id) WHERE is_default`.
Deleting the default address promotes the oldest remaining one (application logic).

### categories
```text
id uuid pk, name, slug unique, parent_id fk → categories null,
status (ACTIVE | INACTIVE), created_at, updated_at
```

### products
```text
id uuid pk, sku varchar(64) unique, slug varchar(180) unique,
name, description text, price numeric(12,2) check (price >= 0),
compare_at_price numeric(12,2) null, category_id fk null,
status (DRAFT | ACTIVE | INACTIVE | ARCHIVED),
weight_grams int null, created_at, updated_at
```

### product_images
```text
id uuid pk, product_id fk, url text, storage_key text,
alt_text, sort_order int, created_at
```
Metadata only — binaries live in object storage.

### inventory
```text
id uuid pk, product_id fk unique,
available_quantity int not null check (available_quantity >= 0),
reserved_quantity int not null check (reserved_quantity >= 0),
sold_quantity int not null default 0,
updated_at
```

### reservations
```text
id uuid pk, order_id uuid, product_id fk, quantity int > 0,
status (ACTIVE | RELEASED | CONFIRMED | EXPIRED),
expires_at timestamptz, created_at
```

### carts / cart_items
```text
carts:       id uuid pk, user_id fk unique (one active cart), created_at, updated_at
cart_items:  id uuid pk, cart_id fk, product_id fk,
             quantity int > 0, unit_price_snapshot numeric(12,2),
             unique (cart_id, product_id), created_at
```

## orders schema

### orders
```text
id uuid pk, order_number varchar(30) unique,  -- e.g. ORD-20260927-8F3K
user_id uuid, status varchar(30),
subtotal numeric(12,2), discount_amount numeric(12,2) default 0,
shipping_amount numeric(12,2) default 0, total_amount numeric(12,2),
currency char(3) default 'IDR',
shipping_address_snapshot jsonb,   -- frozen at creation
created_at, updated_at
```

### order_items
```text
id uuid pk, order_id fk, product_id uuid,
sku_snapshot, product_name_snapshot, unit_price numeric(12,2),
quantity int, subtotal numeric(12,2)
```
Snapshots guarantee historical orders stay accurate after catalog changes.

### order_history
```text
id uuid pk, order_id fk, from_status, to_status,
reason text, actor_type (CUSTOMER | ADMIN | SYSTEM | WEBHOOK),
actor_id uuid null, created_at
```

## payments schema

### payments
```text
id uuid pk, order_id fk, external_payment_id,
provider varchar(30), amount numeric(12,2), currency char(3),
status (PENDING | PAID | FAILED | EXPIRED | CANCELLED | REFUNDED),
payment_method, expires_at, paid_at, created_at, updated_at
```

### webhook_events
```text
id uuid pk, provider, external_event_id unique,
event_type, payload jsonb, signature text,
status (RECEIVED | PROCESSED | FAILED | DUPLICATE),
processed_at, created_at
```
`external_event_id` unique constraint is the hard idempotency guarantee.

### idempotency_keys
```text
key varchar(64) pk, endpoint text, request_hash text,
response_snapshot jsonb, status, created_at, expires_at
```

## notifications schema

```text
notifications: id, user_id, order_id null, channel (EMAIL | WHATSAPP),
               template, recipient, subject, body,
               status (PENDING | SENT | FAILED | RETRYING),
               provider_message_id, retry_count, sent_at, created_at
templates:     id, key unique, channel, subject_template, body_template, created_at
delivery_attempts: id, notification_id fk, attempt_no, outcome, error_detail, attempted_at
```

## ai schema

```text
conversations: id, user_id, title, created_at
messages:      id, conversation_id fk, role (USER | ASSISTANT | TOOL),
               content text, tool_name null, tool_payload jsonb, created_at
documents:     id, source_key, title, content text, chunk_count, created_at
chunks:        id, document_id fk, chunk_index, content, embedding vector(1536)
```
Vector search uses pgvector with an HNSW index.

## Indexing Strategy

```sql
-- commerce
CREATE INDEX idx_products_status        ON products (status);
CREATE INDEX idx_products_category      ON products (category_id);
CREATE INDEX idx_products_price         ON products (price);
CREATE INDEX idx_products_search        ON products
  USING gin (to_tsvector('english', name || ' ' || coalesce(description,'')));
CREATE INDEX idx_cart_items_cart        ON cart_items (cart_id);
CREATE INDEX idx_addresses_user         ON addresses (user_id);
CREATE INDEX idx_reservations_status_exp ON reservations (status, expires_at)
  WHERE status = 'ACTIVE';

-- orders
CREATE INDEX idx_orders_user            ON orders (user_id);
CREATE INDEX idx_orders_status          ON orders (status);
CREATE INDEX idx_order_items_order      ON order_items (order_id);
CREATE INDEX idx_order_history_order    ON order_history (order_id);
CREATE INDEX idx_payments_order         ON payments (order_id);

-- notifications
CREATE INDEX idx_notifications_user     ON notifications (user_id);
CREATE INDEX idx_notifications_status   ON notifications (status) WHERE status IN ('PENDING','RETRYING');
```

Unique constraints on `users.email`, `products.sku`, `products.slug`,
`orders.order_number` double as indexes.

Slow queries are investigated with `EXPLAIN (ANALYZE, BUFFERS)` — findings go in
`docs/database/`.

## Transactions vs Events

| Operation | Strategy |
|---|---|
| Inventory reserve + order + items create | **Single DB transaction** (atomic) |
| Payment status update + order status update | DB transaction in order-service |
| Notification send after OrderPaid | Eventual (RabbitMQ), idempotent consumer |
| Search index update | Eventual, may lag seconds |

## Concurrency Controls

- **Inventory reserve:** `SELECT ... FOR UPDATE` on the inventory row inside a
  transaction, then conditional `UPDATE ... WHERE available_quantity >= $qty`.
  Two concurrent checkouts on the last unit → exactly one succeeds.
- **Webhook processing:** insert-first into `webhook_events` relying on the
  unique `external_event_id`; conflict → short-circuit as duplicate.
- **Reservation expiry:** scheduled job flips `ACTIVE`+expired → `RELEASED` and
  returns quantity to `available_quantity`.
