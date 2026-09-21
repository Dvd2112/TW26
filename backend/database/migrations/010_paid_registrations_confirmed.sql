-- TW26 — migração: aprovado == pago
-- Inscrições com pagamento pago (ex.: gratuitas/staff, que antes ficavam 'pending'
-- até aprovação manual) passam a 'confirmed'.
-- Idempotente: pode ser rodada de novo sem efeito colateral.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/010_paid_registrations_confirmed.sql

BEGIN;

UPDATE registrations
   SET status       = 'confirmed',
       confirmed_at = COALESCE(confirmed_at, registered_at)
 WHERE status = 'pending'
   AND payment_status = 'paid';

COMMIT;
