-- ============================================================
-- Migration 010: Adiciona colunas de planta baixa ao projeto
-- floor_plan_layout  — JSONB com InteractiveRoom[] (x, y, w, h de cada cômodo)
-- floor_plan_image_url — URL da imagem de fundo da planta baixa (quando veio de foto)
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS floor_plan_layout    JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS floor_plan_image_url TEXT  DEFAULT NULL;

COMMENT ON COLUMN projects.floor_plan_layout    IS 'Layout interativo dos cômodos (InteractiveRoom[]) serializado como JSON';
COMMENT ON COLUMN projects.floor_plan_image_url IS 'URL da imagem de fundo da planta baixa (upload do usuário)';
