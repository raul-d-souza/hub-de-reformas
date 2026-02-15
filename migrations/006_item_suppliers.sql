-- ============================================================
-- Migration 006: Item Suppliers — Associação de fornecedores a itens da obra
-- Permite vincular um fornecedor a um item com preço unitário e nota.
-- Execute no SQL Editor do Supabase ou via CLI.
-- ============================================================

-- 1. Tabela de associação item ↔ supplier
CREATE TABLE IF NOT EXISTS public.item_suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14, 2) GENERATED ALWAYS AS (unit_price) STORED, -- pode ser expandido futuramente
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Evitar duplicata: mesmo fornecedor não pode ser vinculado 2x ao mesmo item
  UNIQUE (item_id, supplier_id)
);

-- 2. Índices
CREATE INDEX idx_item_suppliers_item     ON public.item_suppliers(item_id);
CREATE INDEX idx_item_suppliers_supplier ON public.item_suppliers(supplier_id);

-- 3. RLS — acesso via owner do projeto (mesma lógica de items)
ALTER TABLE public.item_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_suppliers_select_via_project" ON public.item_suppliers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.projects ON projects.id = items.project_id
      WHERE items.id = item_suppliers.item_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "item_suppliers_insert_via_project" ON public.item_suppliers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.projects ON projects.id = items.project_id
      WHERE items.id = item_suppliers.item_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "item_suppliers_update_via_project" ON public.item_suppliers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.projects ON projects.id = items.project_id
      WHERE items.id = item_suppliers.item_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "item_suppliers_delete_via_project" ON public.item_suppliers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.items
      JOIN public.projects ON projects.id = items.project_id
      WHERE items.id = item_suppliers.item_id
        AND projects.owner_id = auth.uid()
    )
  );

-- 4. Trigger para updated_at
CREATE TRIGGER set_updated_at_item_suppliers
  BEFORE UPDATE ON public.item_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
