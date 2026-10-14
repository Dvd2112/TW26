-- 025 — Palestras com auto-inscrição de pagos.
-- activities.auto_enroll_paid: quando TRUE, todo participante com pagamento
-- confirmado é inscrito na atividade (os já pagos na criação e os que pagarem depois).
BEGIN;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS auto_enroll_paid BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
