-- 018 — Ideathon - Jornada GovTech gratuito para todos os participantes.
BEGIN;

ALTER TABLE hackathon_settings
    DROP CONSTRAINT IF EXISTS hackathon_settings_price_check;

UPDATE hackathon_settings
SET price = 0,
    free_for_paid_participants = TRUE,
    charge_others = FALSE,
    pix_link = NULL,
    qr_code_path = NULL,
    updated_at = NOW()
WHERE id = 1;

ALTER TABLE hackathon_settings
    ADD CONSTRAINT hackathon_settings_price_check CHECK (price = 0);

UPDATE hackathon_members
SET amount = 0,
    payment_status = 'free'
WHERE payment_status <> 'free';

COMMIT;

