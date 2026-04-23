-- TW26 — PostgreSQL schema (9 tabelas)
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
    id            SERIAL      PRIMARY KEY,
    name          TEXT        NOT NULL,
    cpf           TEXT        NOT NULL UNIQUE,
    email         TEXT        NOT NULL UNIQUE,
    institution   TEXT,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    price       NUMERIC(10, 2) NOT NULL,
    capacity    INTEGER        NOT NULL,
    order_index INTEGER        NOT NULL,
    starts_at   TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ,
    is_active   BOOLEAN        NOT NULL DEFAULT FALSE,
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
                          CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    registered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at      TIMESTAMPTZ
);

-- ─── payments ─────────────────────────────────────────────────────────────────
-- amount = snapshot do preço do lote no momento do pagamento.
-- gateway_payload = resposta bruta do gateway (auditoria / reconciliação).
CREATE TABLE IF NOT EXISTS payments (
    id                     SERIAL         PRIMARY KEY,
    registration_id        INTEGER        NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    amount                 NUMERIC(10, 2) NOT NULL,
    status                 TEXT           NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    gateway                TEXT,
    gateway_transaction_id TEXT,
    gateway_payload        JSONB,
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

-- ─── indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf            ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_registrations_user   ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_lote   ON registrations(lote_id);
CREATE INDEX IF NOT EXISTS idx_payments_reg         ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user     ON activity_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_activity ON activity_enrollments(activity_id);

COMMIT;
