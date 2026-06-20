-- TW26 — migração: adiciona colunas de verificação de e-mail na tabela users
-- Execução (banco já existente): psql -U tw26 -d tw26 -f backend/database/migrations/002_email_verification.sql

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_token         TEXT,
    ADD COLUMN IF NOT EXISTS email_token_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email_token ON users(email_token);

COMMIT;
