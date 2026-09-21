-- TW26 — migração: índice sequencial do participante dentro do lote
-- lote_index = posição (1, 2, 3...) da inscrição PAGA dentro do lote. É atribuído
-- só quando o pagamento é confirmado (ou na inscrição gratuita) e nunca é reaproveitado.
-- Dois participantes podem ter o mesmo índice, desde que em lotes diferentes.
-- Idempotente: pode ser rodada de novo sem efeito colateral.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/011_registration_lote_index.sql

BEGIN;

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS lote_index INTEGER
        CHECK (lote_index IS NULL OR lote_index >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS registrations_lote_index_uniq
    ON registrations (lote_id, lote_index)
    WHERE lote_index IS NOT NULL;

-- Backfill: inscrições já pagas recebem o índice por ordem de pagamento, dentro do
-- lote, continuando depois do maior índice já existente (seguro para rodar de novo).
WITH ranked AS (
    SELECT r.id,
           r.lote_id,
           ROW_NUMBER() OVER (
               PARTITION BY r.lote_id
               ORDER BY COALESCE(
                            (SELECT MAX(p.paid_at) FROM payments p WHERE p.registration_id = r.id),
                            r.confirmed_at,
                            r.registered_at
                        ),
                        r.id
           ) AS rn
    FROM registrations r
    WHERE r.lote_id IS NOT NULL
      AND r.payment_status = 'paid'
      AND r.lote_index IS NULL
)
UPDATE registrations r
   SET lote_index = ranked.rn + COALESCE(
           (SELECT MAX(x.lote_index) FROM registrations x WHERE x.lote_id = ranked.lote_id), 0)
  FROM ranked
 WHERE r.id = ranked.id;

COMMIT;
