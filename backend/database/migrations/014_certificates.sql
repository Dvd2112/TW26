-- TW26 — migração: certificados de participação
--
-- Registra cada certificado emitido para permitir verificação pública
-- (?page=verify-certificate&code=...), igual ao padrão de verify-email.php.
-- total_hours é um snapshot da carga horária calculada a partir de
-- activity_attendance no momento da emissão (soma de end_at - start_at das
-- atividades em que o participante confirmou presença).
--
-- Idempotente: pode ser rodada de novo sem efeito colateral.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/014_certificates.sql

BEGIN;

CREATE TABLE IF NOT EXISTS certificates (
    id           SERIAL         PRIMARY KEY,
    user_id      INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code         TEXT           NOT NULL UNIQUE,
    total_hours  NUMERIC(5, 1)  NOT NULL,
    issued_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(code);

COMMIT;
