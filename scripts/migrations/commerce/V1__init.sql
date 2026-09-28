-- commerce schema initial migration (idempotent).

-- Users -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           varchar(120) NOT NULL,
  email          citext NOT NULL UNIQUE,
  password_hash  text,
  role           varchar(20) NOT NULL DEFAULT 'CUSTOMER'
                 CHECK (role IN ('CUSTOMER','ADMIN')),
  status         varchar(20) NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE','SUSPENDED','DISABLED')),
  oauth_provider varchar(30),
  oauth_subject  varchar(255),
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Addresses -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.addresses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES commerce.users (id) ON DELETE CASCADE,
  label          varchar(50),
  recipient_name varchar(120) NOT NULL,
  phone          varchar(30) NOT NULL,
  address_line   varchar(255) NOT NULL,
  city           varchar(100) NOT NULL,
  province       varchar(100) NOT NULL,
  postal_code    varchar(20) NOT NULL,
  country        varchar(2) NOT NULL DEFAULT 'ID',
  is_default     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_one_default
  ON commerce.addresses (user_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS idx_addresses_user ON commerce.addresses (user_id);

-- Categories ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(120) NOT NULL,
  slug       varchar(180) NOT NULL UNIQUE,
  parent_id  uuid REFERENCES commerce.categories (id),
  status     varchar(20) NOT NULL DEFAULT 'ACTIVE'
             CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               varchar(64) NOT NULL UNIQUE,
  slug              varchar(180) NOT NULL UNIQUE,
  name              varchar(255) NOT NULL,
  description       text,
  price             numeric(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price  numeric(12,2),
  category_id       uuid REFERENCES commerce.categories (id),
  status            varchar(20) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','ARCHIVED')),
  weight_grams      integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_status   ON commerce.products (status);
CREATE INDEX IF NOT EXISTS idx_products_category ON commerce.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_price    ON commerce.products (price);
CREATE INDEX IF NOT EXISTS idx_products_search ON commerce.products
  USING gin (to_tsvector('english', name || ' ' || coalesce(description, '')));

-- Product images --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.product_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES commerce.products (id) ON DELETE CASCADE,
  url         text NOT NULL,
  storage_key text NOT NULL,
  alt_text    varchar(255),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON commerce.product_images (product_id);

-- Inventory -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.inventory (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid NOT NULL UNIQUE REFERENCES commerce.products (id) ON DELETE CASCADE,
  available_quantity integer NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  reserved_quantity  integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  sold_quantity      integer NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Reservations ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL,
  product_id  uuid NOT NULL REFERENCES commerce.products (id),
  quantity    integer NOT NULL CHECK (quantity > 0),
  status      varchar(20) NOT NULL DEFAULT 'ACTIVE'
              CHECK (status IN ('ACTIVE','RELEASED','CONFIRMED','EXPIRED')),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservations_status_exp
  ON commerce.reservations (status, expires_at) WHERE status = 'ACTIVE';

-- Carts -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.carts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES commerce.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce.cart_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id              uuid NOT NULL REFERENCES commerce.carts (id) ON DELETE CASCADE,
  product_id           uuid NOT NULL REFERENCES commerce.products (id),
  quantity             integer NOT NULL CHECK (quantity > 0),
  unit_price_snapshot  numeric(12,2) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON commerce.cart_items (cart_id);

-- Audit log (gateway/auth writes here in later phases) ------------------------
CREATE TABLE IF NOT EXISTS commerce.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid,
  actor_role    varchar(20),
  action        varchar(60) NOT NULL,
  resource_type varchar(60),
  resource_id   text,
  metadata      jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON commerce.audit_logs (action, created_at);
