-- ============================================================
-- Hub de Reformas — Migration: Documentos e Storage
-- Aplique via SQL Editor do Supabase ou psql
-- ============================================================

-- ============================================================
-- 1. Enum de tipo de documento
-- ============================================================
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'contract',        -- Contrato
    'receipt',         -- Comprovante de pagamento
    'invoice',         -- Nota fiscal
    'budget',          -- Orçamento
    'blueprint',       -- Planta / projeto técnico
    'photo',           -- Foto (antes/depois, acompanhamento)
    'report',          -- Relatório
    'other'            -- Outro
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Tabela: documents (documentos de um projeto)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Metadados
  name TEXT NOT NULL,                               -- Nome amigável (ex: "Contrato Pedreiro João")
  description TEXT,                                 -- Descrição opcional
  doc_type document_type NOT NULL DEFAULT 'other',  -- Tipo de documento

  -- Referências opcionais
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,    -- Vínculo com pagamento
  installment_id UUID REFERENCES public.installments(id) ON DELETE SET NULL, -- Vínculo com parcela
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,  -- Vínculo com fornecedor

  -- Arquivo (Supabase Storage)
  file_path TEXT NOT NULL,         -- Caminho no bucket (ex: "<user_id>/<project_id>/<uuid>_nome.pdf")
  file_name TEXT NOT NULL,         -- Nome original do arquivo
  file_size INTEGER NOT NULL,      -- Tamanho em bytes
  mime_type TEXT NOT NULL,         -- MIME type (application/pdf, image/jpeg, etc.)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_owner ON public.documents(owner_id);
CREATE INDEX idx_documents_payment ON public.documents(payment_id);
CREATE INDEX idx_documents_installment ON public.documents(installment_id);
CREATE INDEX idx_documents_doc_type ON public.documents(doc_type);

-- ============================================================
-- 3. RLS para documents
-- ============================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own" ON public.documents
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "documents_insert_own" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- 4. Trigger de updated_at
-- ============================================================
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. Storage Bucket (executar no SQL Editor ou via Dashboard)
-- ============================================================
-- Criar o bucket 'project-documents' para armazenar os arquivos.
-- NOTA: Se preferir, crie via Dashboard > Storage > New bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false,  -- Bucket privado (requer auth)
  52428800, -- 50 MB max per file
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Storage Policies — Cada usuário acessa só seus arquivos
-- O path segue o padrão: <user_id>/<project_id>/<filename>
-- ============================================================

-- SELECT: usuário pode ver seus arquivos
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT: usuário pode fazer upload na sua pasta
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: usuário pode atualizar seus arquivos
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: usuário pode deletar seus arquivos
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
