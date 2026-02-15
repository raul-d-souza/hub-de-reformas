-- ============================================================
-- Migration 007 REPAIR — Script seguro para re-execução
-- Usa DO blocks para checar existência antes de criar.
-- Cole e execute no SQL Editor do Supabase.
-- ============================================================

-- 1. Enum user_role (já existe, pular)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('client', 'supplier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Adicionar colunas a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

-- 3. Vincular suppliers a user_id
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_user ON public.suppliers(user_id);

-- ============================================================
-- 4. Tabela: supplier_services
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'service',
  unit        TEXT DEFAULT 'un',
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_services_supplier ON public.supplier_services(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_services_category ON public.supplier_services(category);

-- ============================================================
-- 5. Enum invitation_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. Tabela: project_invitations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  invited_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       invitation_status NOT NULL DEFAULT 'pending',
  message      TEXT,
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_project  ON public.project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_supplier ON public.project_invitations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status   ON public.project_invitations(status);

-- ============================================================
-- 7. Enum bid_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected', 'counter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 8. Tabela: project_bids
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_bids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  bid_type      TEXT NOT NULL DEFAULT 'total',
  total_price   NUMERIC(12,2),
  items_detail  JSONB,
  status        bid_status NOT NULL DEFAULT 'pending',
  note          TEXT,
  parent_bid_id UUID REFERENCES public.project_bids(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_project  ON public.project_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_supplier ON public.project_bids(supplier_id);
CREATE INDEX IF NOT EXISTS idx_bids_status   ON public.project_bids(status);

-- ============================================================
-- 9. Tabela: supplier_schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  deadline      DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_schedules_project  ON public.supplier_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_schedules_supplier ON public.supplier_schedules(supplier_id);

-- ============================================================
-- 10. Tabela: attendance_records
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

CREATE INDEX IF NOT EXISTS idx_attendance_project  ON public.attendance_records(project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_supplier ON public.attendance_records(supplier_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON public.attendance_records(date);

-- ============================================================
-- 11. RLS policies (usa IF NOT EXISTS via DO blocks)
-- ============================================================

-- profiles: leitura pública
DO $$ BEGIN
  CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- supplier_services
ALTER TABLE public.supplier_services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "supplier_services_select_all" ON public.supplier_services FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "supplier_services_insert_own" ON public.supplier_services
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_services.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "supplier_services_update_own" ON public.supplier_services
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_services.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "supplier_services_delete_own" ON public.supplier_services
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_services.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_invitations
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "invitations_select_client" ON public.project_invitations FOR SELECT USING (auth.uid() = invited_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "invitations_select_supplier" ON public.project_invitations
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = project_invitations.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "invitations_insert_client" ON public.project_invitations FOR INSERT WITH CHECK (auth.uid() = invited_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "invitations_update_supplier" ON public.project_invitations
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = project_invitations.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_bids
ALTER TABLE public.project_bids ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bids_select_project_owner" ON public.project_bids
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_bids.project_id AND projects.owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bids_select_supplier" ON public.project_bids
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = project_bids.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bids_insert_supplier" ON public.project_bids
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = project_bids.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bids_update_project_owner" ON public.project_bids
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_bids.project_id AND projects.owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bids_update_supplier" ON public.project_bids
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = project_bids.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- supplier_schedules
ALTER TABLE public.supplier_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "schedules_select_project_owner" ON public.supplier_schedules
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.projects WHERE projects.id = supplier_schedules.project_id AND projects.owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "schedules_select_supplier" ON public.supplier_schedules
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_schedules.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "schedules_insert_supplier" ON public.supplier_schedules
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_schedules.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "schedules_update_supplier" ON public.supplier_schedules
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_schedules.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "schedules_delete_supplier" ON public.supplier_schedules
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_schedules.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- attendance_records
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "attendance_select_project_owner" ON public.attendance_records
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.projects WHERE projects.id = attendance_records.project_id AND projects.owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_select_supplier" ON public.attendance_records
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = attendance_records.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_insert_supplier" ON public.attendance_records
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = attendance_records.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_update_supplier" ON public.attendance_records
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = attendance_records.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_delete_supplier" ON public.attendance_records
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = attendance_records.supplier_id AND suppliers.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- suppliers: fornecedor logado vê/edita o seu + leitura pública
DO $$ BEGIN
  CREATE POLICY "suppliers_select_own_user" ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "suppliers_update_own_user" ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "suppliers_select_public" ON public.suppliers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 12. Triggers para updated_at
-- ============================================================
DROP TRIGGER IF EXISTS set_supplier_services_updated_at ON public.supplier_services;
CREATE TRIGGER set_supplier_services_updated_at
  BEFORE UPDATE ON public.supplier_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_invitations_updated_at ON public.project_invitations;
CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON public.project_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_bids_updated_at ON public.project_bids;
CREATE TRIGGER set_bids_updated_at
  BEFORE UPDATE ON public.project_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_schedules_updated_at ON public.supplier_schedules;
CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON public.supplier_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 13. Atualizar trigger handle_new_user para aceitar role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'client');

  -- Validar que é um role válido
  IF _role NOT IN ('client', 'supplier') THEN
    _role := 'client';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    _role::public.user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 14. Trigger para criar supplier automaticamente ao registrar como fornecedor
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
      '',
      NEW.id,
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_supplier_profile_created ON public.profiles;
CREATE TRIGGER on_supplier_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'supplier')
  EXECUTE FUNCTION public.handle_new_supplier_profile();
