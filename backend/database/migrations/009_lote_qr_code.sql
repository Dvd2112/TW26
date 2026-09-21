-- TW26 — migração: dados de pagamento PIX por lote
-- qr_code_path = nome do arquivo em storage/qrcodes/ (gerado pelo servidor); NULL = sem QR.
-- pix_link     = link do PIX (http/https) exibido como botão na tela de pagamento; NULL = sem link.
-- Idempotente: pode ser rodada de novo sem efeito colateral.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/009_lote_qr_code.sql

BEGIN;

ALTER TABLE lotes
    ADD COLUMN IF NOT EXISTS qr_code_path TEXT,
    ADD COLUMN IF NOT EXISTS pix_link     TEXT;

COMMIT;
