-- TW26 — migração: lote passa a ser exclusivo de um tipo de usuário
-- participant_type: 'participant' (normal), 'volunteer' ou 'staff'.
-- Lotes já existentes ficam como 'participant' (normal).
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/008_lote_participant_type.sql

BEGIN;

ALTER TABLE lotes
    ADD COLUMN IF NOT EXISTS participant_type TEXT NOT NULL DEFAULT 'participant';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lotes_participant_type_check'
    ) THEN
        ALTER TABLE lotes
            ADD CONSTRAINT lotes_participant_type_check
            CHECK (participant_type IN ('participant', 'volunteer', 'staff'));
    END IF;
END
$$;

COMMIT;
