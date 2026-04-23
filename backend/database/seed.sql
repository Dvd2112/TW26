-- TW26 — seed: permissões iniciais
-- Execução: psql -U tw26 -d tw26 -f backend/database/seed.sql
-- ON CONFLICT garante idempotência (pode rodar várias vezes sem erro).

INSERT INTO permissions (slug, name, description)
VALUES
    (
        'super_admin',
        'Super Admin',
        'Acesso total ao sistema, incluindo visualização de valores e gestão financeira do evento.'
    ),
    (
        'content_admin',
        'Admin de Conteúdo',
        'Gerencia atividades, programação e dados de palestrantes/facilitadores.'
    ),
    (
        'registration_admin',
        'Admin de Inscrições',
        'Gerencia lotes, participantes e status de pagamento.'
    ),
    (
        'credentialer',
        'Credenciador',
        'Valida presença e realiza check-in de participantes no evento.'
    )
ON CONFLICT (slug) DO NOTHING;
