-- TW26 — PostgreSQL schema (15 tabelas)
-- Execução: psql -U tw26 -d tw26 -f backend/database/schema.sql

BEGIN;

-- ─── permissions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
    id          SERIAL      PRIMARY KEY,
    slug        TEXT        NOT NULL UNIQUE,
    name        TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                    SERIAL      PRIMARY KEY,
    name                  TEXT        NOT NULL,
    cpf                   TEXT        NOT NULL UNIQUE,
    email                 TEXT        NOT NULL UNIQUE,
    institution           TEXT,
    password_hash         TEXT        NOT NULL,
    participant_type      TEXT        NOT NULL DEFAULT 'participant'
                              CHECK (participant_type IN ('participant', 'volunteer', 'staff')),
    email_verified_at     TIMESTAMPTZ,
    email_token           TEXT,
    email_token_expires   TIMESTAMPTZ,
    -- "crachá" do participante: é este código que vira QR na Minha Conta e que o
    -- credenciador lê/digita para registrar presença. DEFAULT volátil = um código
    -- distinto por linha, inclusive no backfill de quem já estava cadastrado.
    checkin_code          TEXT        NOT NULL UNIQUE
                              DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── user_permissions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id       INTEGER     NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    permission_id INTEGER     NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by    INTEGER              REFERENCES users(id)       ON DELETE SET NULL,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, permission_id)
);

-- ─── presaves ─────────────────────────────────────────────────────────────────
-- Limite de vagas controlado por PRESAVE_LIMIT no .env (application level).
CREATE TABLE IF NOT EXISTS presaves (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── lotes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lotes (
    id          SERIAL         PRIMARY KEY,
    name        TEXT           NOT NULL,
    institution TEXT, -- NULL = qualquer instituição (lote genérico)
    participant_type TEXT      NOT NULL DEFAULT 'participant'
                          CONSTRAINT lotes_participant_type_check
                          CHECK (participant_type IN ('participant', 'volunteer', 'staff')),
    price      NUMERIC(10, 2) NOT NULL,
    capacity    INTEGER        NOT NULL,
    order_index INTEGER        NOT NULL,
    volunteer_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
                          CHECK (volunteer_discount_percent >= 0 AND volunteer_discount_percent <= 100),
    starts_at   TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ,
    is_active   BOOLEAN        NOT NULL DEFAULT FALSE,
    qr_code_path TEXT, -- imagem do QR PIX (com o valor) em storage/qrcodes/; NULL = sem QR
    pix_link    TEXT, -- link do PIX (http/https) mostrado como botão no pagamento; NULL = sem link
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── registrations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registrations (
    id                SERIAL      PRIMARY KEY,
    user_id           INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    lote_id           INTEGER              REFERENCES lotes(id)        ON DELETE SET NULL,
    came_from_presave BOOLEAN     NOT NULL DEFAULT FALSE,
    status            TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    payment_status    TEXT        NOT NULL DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid', 'awaiting_confirmation', 'paid', 'refunded')),
    participant_type  TEXT,
    registered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at      TIMESTAMPTZ,
    lote_index        INTEGER     CHECK (lote_index IS NULL OR lote_index >= 1) -- nº sequencial do pago no lote (1..N); NULL até pagar
);

-- Mesmo índice pode existir em lotes diferentes, nunca repetido dentro do mesmo lote.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_lote_index_uniq
    ON registrations (lote_id, lote_index)
    WHERE lote_index IS NOT NULL;

-- ─── payments ─────────────────────────────────────────────────────────────────
-- amount = snapshot do preço do lote no momento do pagamento.
-- gateway_payload = resposta bruta do gateway (auditoria / reconciliação).
CREATE TABLE IF NOT EXISTS payments (
    id                     SERIAL         PRIMARY KEY,
    registration_id        INTEGER        NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    amount                 NUMERIC(10, 2) NOT NULL,
    status                 TEXT           NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'awaiting_confirmation', 'paid', 'failed', 'refunded')),
    gateway                TEXT,
    gateway_transaction_id TEXT,
    gateway_payload        JSONB,
    participant_confirmed_at TIMESTAMPTZ,
    confirmed_by           INTEGER                REFERENCES users(id) ON DELETE SET NULL,
    confirmed_note         TEXT,
    proof_path             TEXT,
    proof_uploaded_at      TIMESTAMPTZ,
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    paid_at                TIMESTAMPTZ
);

-- ─── activities ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
    id                SERIAL      PRIMARY KEY,
    title             TEXT        NOT NULL,
    type              TEXT        NOT NULL
                          CHECK (type IN ('palestra', 'workshop', 'oficina')),
    description       TEXT,
    speaker_name      TEXT,
    speaker_bio       TEXT,
    speaker_photo_url TEXT,
    location          TEXT,
    capacity          INTEGER,
    start_at          TIMESTAMPTZ,
    end_at            TIMESTAMPTZ,
    is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
    -- código divulgado na sala; o participante inscrito digita para marcar presença
    attendance_code   TEXT        NOT NULL
                          DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── activity_enrollments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_enrollments (
    id          SERIAL      PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    activity_id INTEGER     NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, activity_id)
);

-- ─── activity_attendance (presença) ──────────────────────────────────────────
-- method: 'scan'   = credenciador leu o QR do participante
--         'manual' = credenciador digitou o checkin_code do participante
--         'self'   = participante digitou o attendance_code da atividade
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

-- ─── activity_credentialers ──────────────────────────────────────────────────
-- Quais atividades cada credenciador pode credenciar. Sem nenhuma linha o
-- credenciador não credencia nada (default deny); super_admin ignora a tabela.
CREATE TABLE IF NOT EXISTS activity_credentialers (
    activity_id INTEGER     NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id     INTEGER     NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    assigned_by INTEGER              REFERENCES users(id)      ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (activity_id, user_id)
);

-- ─── volunteer_applications ───────────────────────────────────────────────────
-- Candidatura a voluntário feita em Minha Conta, após o cadastro.
-- roles = CSV de 'credenciamento'/'montagem'/'hackathon'.
-- event_days = CSV de dias do evento principal (subconjunto de 19,20,21,22).
-- hackathon_days = CSV de dias do hackathon (subconjunto de 17,18).
-- Aprovar marca users.participant_type = 'volunteer'; rejeitar só encerra a candidatura.
CREATE TABLE IF NOT EXISTS volunteer_applications (
    id             SERIAL      PRIMARY KEY,
    user_id        INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    phone          TEXT        NOT NULL,
    roles          TEXT        NOT NULL,
    event_days     TEXT        NOT NULL DEFAULT '',
    hackathon_days TEXT        NOT NULL DEFAULT '',
    motivation     TEXT        NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by    INTEGER              REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── volunteer_settings ────────────────────────────────────────────────────────
-- Linha única (id fixo em 1) que liga/desliga o recebimento de novas candidaturas.
CREATE TABLE IF NOT EXISTS volunteer_settings (
    id                INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    applications_open BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO volunteer_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ─── expenses (saídas) ───────────────────────────────────────────────────────
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

-- ─── revenues (entradas extras: patrocínio, doação, outras) ──────────────────
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

-- ─── indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf            ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_users_email_token    ON users(email_token);
CREATE INDEX IF NOT EXISTS idx_registrations_user   ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_lote   ON registrations(lote_id);
CREATE INDEX IF NOT EXISTS idx_payments_reg         ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user     ON activity_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_activity ON activity_enrollments(activity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_activity    ON activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user        ON activity_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_act_credentialers_user ON activity_credentialers(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_status ON volunteer_applications(status);

COMMIT;
