-- TW26 — migração: tipos de participante, desconto de voluntário e confirmação de pagamento
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/003_inscricoes_pagamentos.sql

BEGIN;

-- users: tipo de participante (define o preço na inscrição)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS participant_type TEXT NOT NULL DEFAULT 'participant'
        CHECK (participant_type IN ('participant', 'volunteer', 'staff'));

-- registrations: snapshot do tipo no momento da inscrição
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS participant_type TEXT;

-- lotes: desconto (%) aplicado a voluntários (staff é sempre gratuito)
ALTER TABLE lotes
    ADD COLUMN IF NOT EXISTS volunteer_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (volunteer_discount_percent >= 0 AND volunteer_discount_percent <= 100);

-- payments: confirmação manual do participante ("já paguei") + confirmação do admin
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS participant_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS confirmed_note TEXT;

-- novo estado 'awaiting_confirmation' no payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'awaiting_confirmation', 'paid', 'failed', 'refunded'));

-- novo estado 'awaiting_confirmation' no registrations.payment_status
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_payment_status_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_payment_status_check
    CHECK (payment_status IN ('unpaid', 'awaiting_confirmation', 'paid', 'refunded'));

COMMIT;