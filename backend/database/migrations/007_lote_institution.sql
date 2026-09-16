-- TW26 — migração: lote passa a poder ser restrito a uma instituição
-- institution = NULL significa "qualquer instituição" (lote genérico).
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/007_lote_institution.sql

BEGIN;

ALTER TABLE lotes
    ADD COLUMN IF NOT EXISTS institution TEXT;

COMMIT;
