-- TW26 — migração: financeiro (entradas extras e saídas)
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/004_financeiro.sql

BEGIN;

-- Saídas (gastos)
CREATE TABLE IF NOT EXISTS expenses (
    id           SERIAL         PRIMARY KEY,
    category     TEXT           NOT NULL,
    description  TEXT           NOT NULL,
    amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_by   INTEGER                 REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Entradas extras (patrocínio, doação, outras) — inscrições ficam em payments
CREATE TABLE IF NOT EXISTS revenues (
    id          SERIAL         PRIMARY KEY,
    category    TEXT           NOT NULL,
    description TEXT           NOT NULL,
    amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    received_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_by  INTEGER                 REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMIT;