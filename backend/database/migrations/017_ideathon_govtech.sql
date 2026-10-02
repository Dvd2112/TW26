-- 017 — Ideathon - Jornada GovTech: equipes de 3 a 6 e dados complementares.
BEGIN;

ALTER TABLE hackathon_settings
    DROP CONSTRAINT IF EXISTS hackathon_settings_min_team_size_check,
    DROP CONSTRAINT IF EXISTS hackathon_settings_max_team_size_check;

UPDATE hackathon_settings SET min_team_size = 3, max_team_size = 6 WHERE id = 1;

ALTER TABLE hackathon_settings
    ADD CONSTRAINT hackathon_settings_min_team_size_check CHECK (min_team_size = 3),
    ADD CONSTRAINT hackathon_settings_max_team_size_check CHECK (max_team_size = 6);

ALTER TABLE hackathon_teams
    ADD COLUMN IF NOT EXISTS lgpd_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS diversity_requirement_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS career_outlook TEXT,
    ADD COLUMN IF NOT EXISTS future_plans TEXT;

ALTER TABLE hackathon_members
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMIT;

