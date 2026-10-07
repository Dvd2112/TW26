-- 020 — Acesso antecipado às atividades, configurado por atividade.
-- activities.published_at: quando foi publicada (base da contagem).
-- activities.early_window_minutes: antecedência (em minutos) dos lotes escolhidos;
--   a atividade abre para todos em published_at + early_window_minutes.
-- activity_early_lotes: lotes cujos pagantes se inscrevem antes da abertura geral.
-- Atividade sem lotes escolhidos = aberta a todos assim que publicada.
BEGIN;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
UPDATE activities SET published_at = updated_at WHERE is_published AND published_at IS NULL;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS early_window_minutes INTEGER
    CHECK (early_window_minutes IS NULL OR early_window_minutes > 0);

CREATE TABLE IF NOT EXISTS activity_early_lotes (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    lote_id     INTEGER NOT NULL REFERENCES lotes(id)      ON DELETE CASCADE,
    PRIMARY KEY (activity_id, lote_id)
);

-- Rascunho anterior (flag global no lote + configuração única), se foi aplicado.
ALTER TABLE lotes DROP COLUMN IF EXISTS early_activity_access;
DROP TABLE IF EXISTS activity_settings;

COMMIT;
