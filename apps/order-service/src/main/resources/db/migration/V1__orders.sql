-- MarketForge order-service initial schema (orders schema)
CREATE TABLE IF NOT EXISTS orders.orders (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number               varchar(30) NOT NULL UNIQUE,
  user_id                    uuid NOT NULL,
  status                     varchar(30) NOT NULL,
  subtotal                   numeric(12,2) NOT NULL,
  discount_amount            numeric(12,2) NOT NULL DEFAULT 0,
  shipping_amount            numeric(12,2) NOT NULL DEFAULT 0,
  total_amount               numeric(12,2) NOT NULL,
  currency                   char(3) NOT NULL DEFAULT 'IDR',
  shipping_address_snapshot  jsonb,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_orders_status CHECK (status IN
    ('PENDING_PAYMENT','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders.orders (status);

CREATE TABLE IF NOT EXISTS orders.order_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                uuid NOT NULL REFERENCES orders.orders (id) ON DELETE CASCADE,
  product_id              uuid NOT NULL,
  sku_snapshot            varchar(64) NOT NULL,
  product_name_snapshot   varchar(255) NOT NULL,
  unit_price              numeric(12,2) NOT NULL,
  quantity                int NOT NULL CHECK (quantity > 0),
  subtotal                numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON orders.order_items (order_id);

CREATE TABLE IF NOT EXISTS orders.order_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders.orders (id) ON DELETE CASCADE,
  from_status varchar(30),
  to_status   varchar(30) NOT NULL,
  reason      text,
  actor_type  varchar(20) NOT NULL CHECK (actor_type IN ('CUSTOMER','ADMIN','SYSTEM','WEBHOOK')),
  actor_id    uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON orders.order_history (order_id);
