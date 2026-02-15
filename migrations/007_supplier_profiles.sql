-- ============================================================
-- Migration 007: Perfis de Fornecedor & Cliente — Sistema dual
-- Adiciona role a profiles, vincula suppliers a auth.users,
-- cria tabelas de convites, lances, agenda e presença.
-- ============================================================

-- 1. Enum para role do usuário
CREATE TYPE user_role AS ENUM ('client', 'supplier');

-- 2. Adicionar role a profiles (default client para usuários existentes)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'client';

-- 3. Campos extras para perfil de fornecedor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,       -- ex: 'eletricista', 'encanador', 'pedreiro'
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

-- 4. Vincular suppliers a um user_id (fornecedor logado)
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_user ON public.suppliers(user_id);

-- ============================================================
-- 5. Tabela: supplier_services (catálogo do fornecedor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'service',  -- 'service' | 'material' | 'labor'
  unit        TEXT DEFAULT 'un',                -- un, m², m³, kg, hora, diária, etc.
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_services_supplier ON public.supplier_services(supplier_id);
CREATE INDEX idx_supplier_services_category ON public.supplier_services(category);

-- ============================================================
-- 6. Enum para status de convite
-- ============================================================
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected');

-- ============================================================
-- 7. Tabela: project_invitations (cliente convida fornecedor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  invited_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       invitation_status NOT NULL DEFAULT 'pending',
  message      TEXT,                   -- mensagem do cliente para o fornecedor
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, supplier_id)
);

CREATE INDEX idx_invitations_project  ON public.project_invitations(project_id);
CREATE INDEX idx_invitations_supplier ON public.project_invitations(supplier_id);
CREATE INDEX idx_invitations_status   ON public.project_invitations(status);

-- ============================================================
-- 8. Enum para status de lance
-- ============================================================
CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected', 'counter');

-- ============================================================
-- 9. Tabela: project_bids (lances/propostas do fornecedor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_bids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  bid_type      TEXT NOT NULL DEFAULT 'total',  -- 'total' | 'per_item'
  total_price   NUMERIC(12,2),                  -- preço total (se bid_type = 'total')
  items_detail  JSONB,                          -- detalhamento por item (se bid_type = 'per_item')
  status        bid_status NOT NULL DEFAULT 'pending',
  note          TEXT,
  parent_bid_id UUID REFERENCES public.project_bids(id) ON DELETE SET NULL,  -- referência ao lance anterior (contra-proposta)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bids_project  ON public.project_bids(project_id);
CREATE INDEX idx_bids_supplier ON public.project_bids(supplier_id);
CREATE INDEX idx_bids_status   ON public.project_bids(status);

-- ============================================================
-- 10. Tabela: supplier_schedules (agenda do fornecedor no projeto)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  deadline      DATE,                   -- prazo máximo de conclusão
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, supplier_id)
);

CREATE INDEX idx_schedules_project  ON public.supplier_schedules(project_id);
CREATE INDEX idx_schedules_supplier ON public.supplier_schedules(supplier_id);

-- ============================================================
-- 11. Tabela: attendance_records (presença na obra)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  check_in     TIMESTAMPTZ,
  check_out    TIMESTAMPTZ,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, supplier_id, date)
);

CREATE INDEX idx_attendance_project  ON public.attendance_records(project_id);
CREATE INDEX idx_attendance_supplier ON public.attendance_records(supplier_id);
CREATE INDEX idx_attendance_date     ON public.attendance_records(date);

-- ============================================================
-- 12. RLS — Row Level Security
-- ============================================================

-- profiles: agora fornecedores podem ver perfis públicos de clientes (e vice-versa)
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);
-- (a policy existente profiles_select_own continua, mas agora adicionamos leitura pública)

-- supplier_services: fornecedor CRUD, todos leem
ALTER TABLE public.supplier_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_services_select_all" ON public.supplier_services
  FOR SELECT USING (true);

CREATE POLICY "supplier_services_insert_own" ON public.supplier_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = supplier_services.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "supplier_services_update_own" ON public.supplier_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = supplier_services.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "supplier_services_delete_own" ON public.supplier_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = supplier_services.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

-- project_invitations: cliente cria, fornecedor vê as suas, ambos atualizam
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_select_client" ON public.project_invitations
  FOR SELECT USING (auth.uid() = invited_by);

CREATE POLICY "invitations_select_supplier" ON public.project_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = project_invitations.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "invitations_insert_client" ON public.project_invitations
  FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "invitations_update_supplier" ON public.project_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = project_invitations.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

-- project_bids: fornecedor cria, dono do projeto vê, ambos atualizam
ALTER TABLE public.project_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bids_select_project_owner" ON public.project_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_bids.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "bids_select_supplier" ON public.project_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = project_bids.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "bids_insert_supplier" ON public.project_bids
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = project_bids.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "bids_update_project_owner" ON public.project_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_bids.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "bids_update_supplier" ON public.project_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = project_bids.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

-- supplier_schedules: fornecedor CRUD, dono do projeto lê
ALTER TABLE public.supplier_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_select_project_owner" ON public.supplier_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = supplier_schedules.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "schedules_select_supplier" ON public.supplier_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = supplier_schedules.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "schedules_insert_supplier" ON public.supplier_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = supplier_schedules.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "schedules_update_supplier" ON public.supplier_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = supplier_schedules.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "schedules_delete_supplier" ON public.supplier_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = supplier_schedules.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

-- attendance_records: fornecedor CRUD, dono do projeto lê
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_project_owner" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = attendance_records.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "attendance_select_supplier" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = attendance_records.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "attendance_insert_supplier" ON public.attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = attendance_records.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "attendance_update_supplier" ON public.attendance_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = attendance_records.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

CREATE POLICY "attendance_delete_supplier" ON public.attendance_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE suppliers.id = attendance_records.supplier_id
        AND suppliers.user_id = auth.uid()
    )
  );

-- Suppliers: agora também fornecedor logado pode ver/editar o seu
CREATE POLICY "suppliers_select_own_user" ON public.suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "suppliers_update_own_user" ON public.suppliers
  FOR UPDATE USING (auth.uid() = user_id);

-- Suppliers: leitura pública para marketplace
CREATE POLICY "suppliers_select_public" ON public.suppliers
  FOR SELECT USING (true);

-- ============================================================
-- 13. Triggers para updated_at automático
-- ============================================================

CREATE TRIGGER set_supplier_services_updated_at
  BEFORE UPDATE ON public.supplier_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON public.project_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_bids_updated_at
  BEFORE UPDATE ON public.project_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON public.supplier_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 14. Atualizar trigger handle_new_user para aceitar role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 15. Função para criar supplier automaticamente ao registrar como fornecedor
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_supplier_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'supplier' THEN
    INSERT INTO public.suppliers (name, contact_name, phone, email, owner_id, user_id)
    VALUES (
      COALESCE(NEW.company_name, NEW.full_name),
      NEW.full_name,
      COALESCE(NEW.phone, ''),
      '',  -- email será preenchido depois
      NEW.id,
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_supplier_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'supplier')
  EXECUTE FUNCTION public.handle_new_supplier_profile();
