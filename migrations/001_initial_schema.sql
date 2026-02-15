-- ============================================================
-- Hub de Reformas — Migration inicial
-- Aplique via: psql $DATABASE_URL < migrations/001_initial_schema.sql
-- ou via Supabase CLI: supabase db push
-- ============================================================

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enum de status de projeto
CREATE TYPE project_status AS ENUM ('draft', 'active', 'paused', 'done');

-- ============================================================
-- 3. Tabela: profiles (espelha auth.users para dados públicos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca por nome
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);

-- ============================================================
-- 4. Tabela: projects (obras)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  start_date DATE,
  end_date DATE,
  status project_status NOT NULL DEFAULT 'draft',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- ============================================================
-- 5. Tabela: items (itens de uma obra)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'un',
  estimated_unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estimated_total NUMERIC(14, 2) GENERATED ALWAYS AS (quantity * estimated_unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_project ON public.items(project_id);

-- ============================================================
-- 6. Tabela: suppliers (fornecedores)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  rating NUMERIC(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_owner ON public.suppliers(owner_id);
CREATE INDEX idx_suppliers_name ON public.suppliers(name);

-- ============================================================
-- 7. Tabela: quotes (cotações)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  chosen BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_quotes_project ON public.quotes(project_id);
CREATE INDEX idx_quotes_supplier ON public.quotes(supplier_id);
CREATE INDEX idx_quotes_chosen ON public.quotes(chosen) WHERE chosen = true;

-- ============================================================
-- 8. Tabela: audit_logs (opcional — registro de ações)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);

-- ============================================================
-- 9. Row Level Security (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES: usuários podem ler/editar apenas seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PROJECTS: owner pode CRUD; outros não veem
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- ITEMS: acesso vinculado ao owner do projeto
CREATE POLICY "items_select_via_project" ON public.items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = items.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "items_insert_via_project" ON public.items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = items.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "items_update_via_project" ON public.items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = items.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "items_delete_via_project" ON public.items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = items.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- SUPPLIERS: owner pode CRUD seus fornecedores
CREATE POLICY "suppliers_select_own" ON public.suppliers
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "suppliers_insert_own" ON public.suppliers
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "suppliers_update_own" ON public.suppliers
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "suppliers_delete_own" ON public.suppliers
  FOR DELETE USING (auth.uid() = owner_id);

-- QUOTES: owner pode CRUD suas cotações
CREATE POLICY "quotes_select_own" ON public.quotes
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "quotes_insert_own" ON public.quotes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "quotes_update_own" ON public.quotes
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "quotes_delete_own" ON public.quotes
  FOR DELETE USING (auth.uid() = owner_id);

-- AUDIT_LOGS: somente leitura dos próprios logs
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 10. Trigger para criar perfil ao criar usuário no auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 11. Funções de updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
