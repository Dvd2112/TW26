-- TW26 — migração: recuperação de senha por código
-- O usuário informa CPF + e-mail, recebe um código de 8 caracteres (hex) por e-mail
-- e tem 15 minutos para redefinir a senha. Só o hash SHA-256 do código é guardado.
--   reset_code_hash     : SHA-256 do código (NULL = nenhum código ativo)
--   reset_code_expires  : validade do código (emissão + 15 min)
--   reset_code_attempts : tentativas erradas; ao chegar em 5 o código é invalidado
--   reset_code_sent_at  : última emissão (limita novo envio a 1 a cada 2 min)
-- Idempotente: pode ser rodada de novo sem efeito colateral.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/014_password_reset.sql

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_code_hash     TEXT,
    ADD COLUMN IF NOT EXISTS reset_code_expires  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reset_code_attempts SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reset_code_sent_at  TIMESTAMPTZ;

COMMIT;
