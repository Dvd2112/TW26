-- 026 — Materiais das atividades (slides, apostilas etc.).
-- Vários arquivos por atividade; file_path é o nome gerado pelo servidor em storage/materiais/.
BEGIN;

CREATE TABLE IF NOT EXISTS activity_materials (
    id            SERIAL      PRIMARY KEY,
    activity_id   INTEGER     NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    title         TEXT        NOT NULL,
    original_name TEXT        NOT NULL,
    file_path     TEXT        NOT NULL UNIQUE,
    size_bytes    INTEGER     NOT NULL,
    uploaded_by   INTEGER              REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_materials_activity ON activity_materials(activity_id);

COMMIT;
