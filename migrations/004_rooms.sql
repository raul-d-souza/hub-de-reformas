-- ============================================================
-- Migration 004: Rooms (Cômodos) — Cômodos vinculados a projetos
-- ============================================================

-- Enum para tipos de cômodo
CREATE TYPE room_type AS ENUM (
  'sacada',
  'varanda',
  'quarto',
  'suite',
  'banheiro',
  'lavabo',
  'cozinha',
  'sala_estar',
  'sala_jantar',
  'escritorio',
  'lavanderia',
  'area_servico',
  'garagem',
  'corredor',
  'hall',
  'despensa',
  'closet',
  'terraço',
  'churrasqueira',
  'piscina',
  'jardim',
  'outro'
);

-- Tabela de cômodos do projeto
CREATE TABLE IF NOT EXISTS project_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_type   room_type NOT NULL,
  custom_name text,                    -- Nome personalizado (ex: "Quarto do João")
  quantity    int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  floor       int DEFAULT 0,           -- Andar (0 = térreo, 1 = 1° andar, etc.)
  area_m2     numeric(8,2),            -- Área estimada em m² (opcional)
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_project_rooms_project ON project_rooms(project_id);
CREATE INDEX idx_project_rooms_type    ON project_rooms(room_type);

-- RLS
ALTER TABLE project_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms: owner can select"
  ON project_rooms FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Rooms: owner can insert"
  ON project_rooms FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Rooms: owner can update"
  ON project_rooms FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Rooms: owner can delete"
  ON project_rooms FOR DELETE
  USING (owner_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_project_rooms
  BEFORE UPDATE ON project_rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Adicionar coluna room_id opcional em items (para vincular item a um cômodo)
ALTER TABLE items ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES project_rooms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_items_room ON items(room_id);
