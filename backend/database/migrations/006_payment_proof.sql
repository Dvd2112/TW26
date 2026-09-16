-- TW26 — migração: comprovante de pagamento anexado pelo participante
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/006_payment_proof.sql

BEGIN;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS proof_path        TEXT,
    ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ;

COMMIT;
