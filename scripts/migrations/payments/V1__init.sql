-- payments schema initial migration (order-service webhook/payment phase).

CREATE TABLE IF NOT EXISTS payments.payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid NOT NULL,
  external_payment_id  varchar(255),
  provider             varchar(30) NOT NULL,
  amount               numeric(12,2) NOT NULL,
  currency             char(3) NOT NULL DEFAULT 'IDR',
  status               varchar(20) NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','PAID','FAILED','EXPIRED','CANCELLED','REFUNDED')),
  payment_method       varchar(50),
  expires_at           timestamptz,
  paid_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_external ON payments.payments (external_payment_id);

CREATE TABLE IF NOT EXISTS payments.webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            varchar(30) NOT NULL,
  external_event_id   varchar(255) NOT NULL UNIQUE,
  event_type          varchar(60) NOT NULL,
  payload             jsonb NOT NULL,
  signature           text,
  status              varchar(20) NOT NULL DEFAULT 'RECEIVED'
                      CHECK (status IN ('RECEIVED','PROCESSED','FAILED','DUPLICATE')),
  processed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments.idempotency_keys (
  key                varchar(64) PRIMARY KEY,
  endpoint           text NOT NULL,
  request_hash       text NOT NULL,
  response_snapshot  jsonb,
  status             varchar(20) NOT NULL DEFAULT 'IN_FLIGHT',
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
