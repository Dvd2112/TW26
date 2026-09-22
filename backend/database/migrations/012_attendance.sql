-- TW26 — migração: presença em atividades (check-in por QR / código)
--
-- Três caminhos de registro de presença:
--   1. credenciador escaneia o QR do participante  → method = 'scan'
--   2. credenciador digita o código do participante → method = 'manual'
--   3. participante digita o código da atividade    → method = 'self'
--
-- users.checkin_code      = "crachá" do participante (o que vira QR na Minha Conta).
-- activities.attendance_code = código divulgado na sala, que o participante digita.
-- activity_credentialers  = quais atividades cada credenciador pode credenciar
--                           (sem linha nenhuma = não credencia nada; super_admin ignora).
--
-- Os DEFAULTs usam random()/clock_timestamp(), que o Postgres avalia por linha, então
-- o ALTER TABLE já faz o backfill com um código distinto para cada registro existente.
-- Hex em maiúsculas: sem ambiguidade entre O/0 e I/1 na hora de ditar ou digitar.
--
-- Idempotente: pode ser rodada de novo sem efeito colateral.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/012_attendance.sql

BEGIN;

-- ─── código do participante (crachá / QR) ────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS checkin_code TEXT NOT NULL
        DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

CREATE UNIQUE INDEX IF NOT EXISTS users_checkin_code_uniq ON users (checkin_code);

-- ─── código da atividade (divulgado na sala) ─────────────────────────────────
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS attendance_code TEXT NOT NULL
        DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

-- ─── presença ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_attendance (
    id            SERIAL      PRIMARY KEY,
    user_id       INTEGER     NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    activity_id   INTEGER     NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    method        TEXT        NOT NULL DEFAULT 'manual'
                      CHECK (method IN ('scan', 'manual', 'self')),
    checked_in_by INTEGER              REFERENCES users(id)      ON DELETE SET NULL,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, activity_id)
);

-- ─── credenciadores designados por atividade ─────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_credentialers (
    activity_id INTEGER     NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id     INTEGER     NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    assigned_by INTEGER              REFERENCES users(id)      ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (activity_id, user_id)
);

-- ─── indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_activity    ON activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user        ON activity_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_act_credentialers_user ON activity_credentialers(user_id);

COMMIT;
