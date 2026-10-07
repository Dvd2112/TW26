-- TW26 — migração: instituição "Ensino Médio" + nome da escola do usuário
-- users.institution passa a aceitar 'ensino_medio' (TEXT livre, sem CHECK);
-- users.school guarda a escola e só é preenchido para essa instituição.
-- Execução: psql -U postgres -d techweek26 -f backend/database/migrations/021_user_school.sql

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS school TEXT;

COMMIT;
