-- 023 — Perfil somente leitura do hackathon (vê equipes e inscrições individuais, sem nenhuma ação).
BEGIN;

INSERT INTO permissions (slug, name, description)
VALUES (
    'hackathon_viewer',
    'Visualizador do Hackathon',
    'Apenas visualiza equipes e inscrições individuais do hackathon; não executa nenhuma ação.'
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
