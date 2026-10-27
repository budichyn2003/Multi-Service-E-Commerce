CREATE TABLE IF NOT EXISTS payments.payments (
  id                   uuid PRIMARY KEY,
  order_id             uuid NOT NULL REFERENCES orders.orders (id) ON DELETE CASCADE,
  external_payment_id  varchar(255) UNIQUE,
  provider             varchar(30) NOT NULL,
  amount               numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency             char(3) NOT NULL DEFAULT 'IDR',
  status               varchar(20) NOT NULL
                       CHECK (status IN ('PENDING','PAID','FAILED','EXPIRED','CANCELLED','REFUNDED')),
  expires_at           timestamptz NOT NULL,
  paid_at              timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_created
  ON payments.payments (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_pending_expiry
  ON payments.payments (expires_at) WHERE status = 'PENDING';
