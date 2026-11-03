-- ai schema initial migration (idempotent).

CREATE TABLE IF NOT EXISTS ai.conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  title      text NOT NULL DEFAULT 'Percakapan Belanja',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON ai.conversations (user_id);

CREATE TABLE IF NOT EXISTS ai.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai.conversations (id) ON DELETE CASCADE,
  role            varchar(20) NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'TOOL', 'SYSTEM')),
  content         text NOT NULL,
  tool_name       varchar(60),
  tool_payload    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON ai.messages (conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS ai.documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key  varchar(120) NOT NULL UNIQUE,
  title       text NOT NULL,
  content     text NOT NULL,
  chunk_count integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Support ticket table for customer service requests per API contract
CREATE TABLE IF NOT EXISTS ai.support_tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  order_number varchar(30),
  subject      text NOT NULL,
  description  text NOT NULL,
  status       varchar(20) NOT NULL DEFAULT 'OPEN'
               CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
  ON ai.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON ai.support_tickets (status);

