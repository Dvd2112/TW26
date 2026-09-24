-- 015 — Hackathon: inscrição por equipe, com pagamento individual por integrante.
-- O admin controla abertura, preço e as regras de gratuidade em hackathon_settings:
--   free_for_paid_participants: quem já pagou a inscrição do evento não paga o hackathon.
--   charge_others: quem NÃO tem inscrição paga no evento paga (ou não) o hackathon.
-- Um usuário inscreve a equipe informando nome/CPF/e-mail de cada integrante; cada
-- integrante (exceto quem inscreveu) aceita ou rejeita o vínculo em ?page=hackathon.
BEGIN;

CREATE TABLE IF NOT EXISTS hackathon_settings (
    id                         INTEGER        PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    registrations_open         BOOLEAN        NOT NULL DEFAULT FALSE,
    price                      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    free_for_paid_participants BOOLEAN        NOT NULL DEFAULT TRUE,
    charge_others              BOOLEAN        NOT NULL DEFAULT TRUE,
    max_teams                  INTEGER        CHECK (max_teams IS NULL OR max_teams > 0), -- NULL = sem limite
    min_team_size              SMALLINT       NOT NULL DEFAULT 2 CHECK (min_team_size >= 1),
    max_team_size              SMALLINT       NOT NULL DEFAULT 5 CHECK (max_team_size >= 1),
    qr_code_path               TEXT,
    pix_link                   TEXT,
    updated_at                 TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

INSERT INTO hackathon_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS hackathon_teams (
    id         SERIAL      PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_by INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS hackathon_teams_name_uniq ON hackathon_teams (lower(name));

-- payment_status: free = isento pela regra; unpaid/awaiting_confirmation/paid = fluxo PIX.
-- amount é o snapshot do preço; recalculado enquanto unpaid (regras podem mudar).
CREATE TABLE IF NOT EXISTS hackathon_members (
    id                SERIAL         PRIMARY KEY,
    team_id           INTEGER        NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
    user_id           INTEGER                 REFERENCES users(id) ON DELETE SET NULL, -- preenchido ao aceitar
    name              TEXT           NOT NULL,
    cpf               TEXT           NOT NULL, -- só dígitos
    email             TEXT           NOT NULL, -- minúsculas
    is_leader         BOOLEAN        NOT NULL DEFAULT FALSE,
    invite_status     TEXT           NOT NULL DEFAULT 'pending'
                          CHECK (invite_status IN ('pending', 'accepted', 'rejected')),
    responded_at      TIMESTAMPTZ,
    amount            NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_status    TEXT           NOT NULL DEFAULT 'unpaid'
                          CHECK (payment_status IN ('free', 'unpaid', 'awaiting_confirmation', 'paid')),
    proof_path        TEXT,
    proof_uploaded_at TIMESTAMPTZ,
    paid_at           TIMESTAMPTZ,
    confirmed_by      INTEGER                 REFERENCES users(id) ON DELETE SET NULL,
    confirmed_note    TEXT,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, cpf),
    UNIQUE (team_id, email)
);

-- Cada pessoa integra no máximo uma equipe (convites pendentes em várias são permitidos).
CREATE UNIQUE INDEX IF NOT EXISTS hackathon_members_user_accepted_uniq
    ON hackathon_members (user_id) WHERE invite_status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_hackathon_members_team  ON hackathon_members(team_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_members_cpf   ON hackathon_members(cpf);
CREATE INDEX IF NOT EXISTS idx_hackathon_members_email ON hackathon_members(email);

COMMIT;
