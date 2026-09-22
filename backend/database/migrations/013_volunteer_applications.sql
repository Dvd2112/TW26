-- TW26 — migração: candidatura a voluntário
-- Fica em Minha Conta (não no wizard de inscrição). O participante escolhe em quais
-- frentes quer ajudar (credenciamento, montagem, hackathon) e os dias disponíveis:
-- evento principal (19 a 22, um checkbox por dia, sem período) e/ou hackathon (17 e 18).
-- A candidatura fica "pending" até um admin (super_admin ou registration_admin)
-- aprovar ou rejeitar; aprovar marca users.participant_type = 'volunteer'.
-- volunteer_settings é uma tabela de linha única que controla se o formulário está
-- aberto — o admin fecha manualmente quando atinge a quantidade de voluntários que quer.
-- Idempotente: pode ser rodada de novo sem efeito colateral.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/013_volunteer_applications.sql

BEGIN;

CREATE TABLE IF NOT EXISTS volunteer_applications (
    id             SERIAL      PRIMARY KEY,
    user_id        INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    phone          TEXT        NOT NULL,
    -- CSV de slugs: 'credenciamento', 'montagem', 'hackathon'
    roles          TEXT        NOT NULL,
    -- CSV de dias do evento principal disponíveis (subconjunto de 19,20,21,22)
    event_days     TEXT        NOT NULL DEFAULT '',
    -- CSV de dias do hackathon disponíveis (subconjunto de 17,18)
    hackathon_days TEXT        NOT NULL DEFAULT '',
    motivation     TEXT        NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by    INTEGER              REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_applications_status ON volunteer_applications(status);

-- Liga/desliga o recebimento de novas candidaturas (linha única, id fixo em 1).
CREATE TABLE IF NOT EXISTS volunteer_settings (
    id                 INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    applications_open  BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO volunteer_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMIT;
