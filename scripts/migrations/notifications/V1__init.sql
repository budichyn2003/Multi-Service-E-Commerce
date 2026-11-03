-- notifications schema initial migration (idempotent).

CREATE TABLE IF NOT EXISTS notifications.notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid,
  order_id            uuid,
  channel             varchar(20) NOT NULL DEFAULT 'EMAIL'
                      CHECK (channel IN ('EMAIL', 'WHATSAPP')),
  template            varchar(50) NOT NULL,
  recipient           varchar(320) NOT NULL,
  subject             varchar(255) NOT NULL,
  body                text NOT NULL,
  status              varchar(20) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRYING')),
  provider_message_id text,
  retry_count         integer NOT NULL DEFAULT 0,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications.notifications (status) WHERE status IN ('PENDING', 'RETRYING');

CREATE TABLE IF NOT EXISTS notifications.templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key              varchar(50) NOT NULL UNIQUE,
  channel          varchar(20) NOT NULL DEFAULT 'EMAIL',
  subject_template text NOT NULL,
  body_template    text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications.delivery_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications.notifications (id) ON DELETE CASCADE,
  attempt_no      integer NOT NULL,
  outcome         varchar(20) NOT NULL,
  error_detail    text,
  attempted_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_notification
  ON notifications.delivery_attempts (notification_id);

-- Initial default email templates
INSERT INTO notifications.templates (key, channel, subject_template, body_template)
VALUES
  ('ORDER_CREATED', 'EMAIL', 'MarketForge — Order Created #{{orderNumber}}', 'Halo {{customerName}}, pesanan Anda #{{orderNumber}} berhasil dibuat dengan total Rp {{totalAmount}}. Silakan lakukan pembayaran.'),
  ('ORDER_PAID', 'EMAIL', 'MarketForge — Payment Received for #{{orderNumber}}', 'Pembayaran untuk pesanan #{{orderNumber}} sebesar Rp {{totalAmount}} telah kami terima. Pesanan Anda segera diproses.'),
  ('ORDER_CANCELLED', 'EMAIL', 'MarketForge — Order #{{orderNumber}} Cancelled', 'Pesanan #{{orderNumber}} telah dibatalkan. Reservasi stok telah dilepaskan.')
ON CONFLICT (key) DO NOTHING;

