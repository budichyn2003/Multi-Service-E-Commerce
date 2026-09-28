-- MarketForge: one database, one schema per service (see DATABASE.md).
-- Runs once on first container start (official postgres entrypoint).
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS ai;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
-- pgvector is enabled when the image supports it; harmless if missing.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
