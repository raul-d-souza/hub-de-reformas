-- ============================================================
-- Hub de Reformas — Migration: Pagamentos e controle financeiro
-- Aplique via SQL Editor do Supabase ou psql
-- ============================================================

-- 1. Enum de método de pagamento
CREATE TYPE payment_method AS ENUM (
  'credit_card',   -- Cartão de crédito
  'debit_card',    -- Cartão de débito
  'pix',           -- Pix
  'boleto',        -- Boleto bancário
  'bank_transfer', -- Transferência bancária
  'cash',          -- Dinheiro
  'check',         -- Cheque
  'auto_debit',    -- Débito automático
  'other'          -- Outro
);

-- 2. Enum de status do pagamento
CREATE TYPE payment_status AS ENUM (
  'pending',    -- Parcela pendente (ainda não venceu)
  'paid',       -- Pago
  'overdue',    -- Vencido e não pago
  'cancelled'   -- Cancelado
);

-- ============================================================
-- 3. Tabela: payments (pagamentos de um projeto)
-- Cada pagamento pode ser à vista (1 parcela) ou parcelado (N parcelas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Descrição do pagamento (ex: "Material piso", "Mão de obra pedreiro")
  description TEXT NOT NULL,
  category TEXT DEFAULT 'material', -- material, labor, service, other

  -- Método e condições
  payment_method payment_method NOT NULL DEFAULT 'pix',
  total_amount NUMERIC(14, 2) NOT NULL,          -- Valor total do pagamento
  is_installment BOOLEAN NOT NULL DEFAULT false,  -- Se é parcelado
  num_installments INTEGER NOT NULL DEFAULT 1,    -- Número de parcelas
  has_interest BOOLEAN NOT NULL DEFAULT false,    -- Se tem juros
  interest_rate NUMERIC(6, 4) DEFAULT 0,          -- Taxa de juros (% ao mês, ex: 1.99)
  total_with_interest NUMERIC(14, 2),             -- Valor total com juros (calculado)

  -- Referência opcional a item ou fornecedor
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,

  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_project ON public.payments(project_id);
CREATE INDEX idx_payments_owner ON public.payments(owner_id);

-- ============================================================
-- 4. Tabela: installments (parcelas individuais)
-- Cada payment com is_installment=true gera N installments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  installment_number INTEGER NOT NULL,           -- Parcela nº (1, 2, 3...)
  amount NUMERIC(14, 2) NOT NULL,                -- Valor da parcela
  due_date DATE NOT NULL,                        -- Data de vencimento
  paid_date DATE,                                -- Data em que foi pago (null se pendente)
  status payment_status NOT NULL DEFAULT 'pending',

  payment_method_used payment_method,            -- Método real usado no pagamento (pode diferir)
  receipt_url TEXT,                               -- URL de comprovante (opcional)
  note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_installments_payment ON public.installments(payment_id);
CREATE INDEX idx_installments_owner ON public.installments(owner_id);
CREATE INDEX idx_installments_status ON public.installments(status);
CREATE INDEX idx_installments_due_date ON public.installments(due_date);

-- ============================================================
-- 5. RLS para payments e installments
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Payments: owner pode CRUD
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "payments_insert_own" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "payments_update_own" ON public.payments
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "payments_delete_own" ON public.payments
  FOR DELETE USING (auth.uid() = owner_id);

-- Installments: owner pode CRUD
CREATE POLICY "installments_select_own" ON public.installments
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "installments_insert_own" ON public.installments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "installments_update_own" ON public.installments
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "installments_delete_own" ON public.installments
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- 6. Triggers de updated_at
-- ============================================================
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_installments_updated_at
  BEFORE UPDATE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
