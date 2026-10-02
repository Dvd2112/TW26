-- 019 — Mantém o histórico de inscrições e libera nova escolha após cancelamento
-- ou expiração da reserva sem comprovante.
BEGIN;

ALTER TABLE registrations
    DROP CONSTRAINT IF EXISTS registrations_user_id_key;

COMMIT;
