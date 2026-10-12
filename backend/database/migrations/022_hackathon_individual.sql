-- 022 — Hackathon: inscrição individual (sem equipe). A organização aloca a pessoa em uma equipe depois.
BEGIN;

CREATE TABLE IF NOT EXISTS hackathon_individuals (
    id             SERIAL      PRIMARY KEY,
    user_id        INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT        NOT NULL,
    cpf            TEXT        NOT NULL, -- só dígitos
    email          TEXT        NOT NULL, -- minúsculas
    phone          TEXT        NOT NULL,
    birth_date     DATE        NOT NULL,
    lgpd_consent   BOOLEAN     NOT NULL DEFAULT FALSE,
    career_outlook TEXT,
    future_plans   TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
