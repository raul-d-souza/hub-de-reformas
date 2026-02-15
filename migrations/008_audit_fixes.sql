-- ============================================================
-- Migration 008: Performance, Integridade e Segurança
-- Correções identificadas na auditoria de arquitetura.
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- ============================================================
-- 1. FIX: handle_new_user trigger — sincronizar role, company_name, specialty
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, company_name, specialty)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'),
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'specialty'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. CHECK constraints para campos TEXT que são enums lógicos
-- ============================================================

-- items.category
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS chk_items_category;
ALTER TABLE public.items
  ADD CONSTRAINT chk_items_category
  CHECK (category IN ('material', 'labor', 'service', 'other'));

-- payments.category
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payments_category;
ALTER TABLE public.payments
  ADD CONSTRAINT chk_payments_category
  CHECK (category IN ('material', 'labor', 'service', 'other'));

-- project_bids.bid_type
ALTER TABLE public.project_bids DROP CONSTRAINT IF EXISTS chk_bids_bid_type;
ALTER TABLE public.project_bids
  ADD CONSTRAINT chk_bids_bid_type
  CHECK (bid_type IN ('total', 'per_item'));

-- supplier_services.category
ALTER TABLE public.supplier_services DROP CONSTRAINT IF EXISTS chk_supplier_services_category;
ALTER TABLE public.supplier_services
  ADD CONSTRAINT chk_supplier_services_category
  CHECK (category IN ('service', 'material', 'labor'));

-- ============================================================
-- 3. Índices compostos para queries frequentes
-- ============================================================

-- Installments pendentes por data (financial dashboard)
CREATE INDEX IF NOT EXISTS idx_installments_pending_due
  ON public.installments(due_date)
  WHERE status = 'pending';

-- Bids por projeto + status (filtragem)
CREATE INDEX IF NOT EXISTS idx_bids_project_status
  ON public.project_bids(project_id, status);

-- Invitations por supplier + status
CREATE INDEX IF NOT EXISTS idx_invitations_supplier_status
  ON public.project_invitations(supplier_id, status);

-- Payments por supplier (lookup reverso)
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id
  ON public.payments(supplier_id)
  WHERE supplier_id IS NOT NULL;

-- ============================================================
-- 4. Database Function: choose_quote (atômica)
-- Evita race condition ao escolher cotação.
-- ============================================================
CREATE OR REPLACE FUNCTION public.choose_quote(
  p_quote_id UUID,
  p_project_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Desmarcar todas
  UPDATE public.quotes
    SET chosen = false
    WHERE project_id = p_project_id AND chosen = true;

  -- Marcar a escolhida
  UPDATE public.quotes
    SET chosen = true
    WHERE id = p_quote_id AND project_id = p_project_id;
END;
$$;

-- ============================================================
-- 5. Database Function: get_financial_summary
-- Calcula resumo financeiro em uma única query no banco,
-- evitando transferir todos os dados para o client.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_project_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH payment_stats AS (
    SELECT
      COALESCE(SUM(COALESCE(p.total_with_interest, p.total_amount)), 0) AS total_payments_cost,
      array_agg(p.item_id) FILTER (WHERE p.item_id IS NOT NULL) AS items_with_payments
    FROM public.payments p
    WHERE p.project_id = p_project_id
  ),
  items_without_payment AS (
    SELECT COALESCE(SUM(i.estimated_total), 0) AS total_items_cost
    FROM public.items i
    WHERE i.project_id = p_project_id
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.item_id = i.id AND p.project_id = p_project_id
      )
  ),
  installment_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN inst.status = 'paid' THEN inst.amount ELSE 0 END), 0) AS total_paid,
      COUNT(*) FILTER (WHERE inst.status = 'pending' AND inst.due_date < CURRENT_DATE) AS overdue_count,
      MIN(inst.due_date) FILTER (WHERE inst.status = 'pending' AND inst.due_date >= CURRENT_DATE) AS next_due_date,
      MAX(inst.due_date) AS last_due_date
    FROM public.installments inst
    INNER JOIN public.payments p ON p.id = inst.payment_id
    WHERE p.project_id = p_project_id
  )
  SELECT json_build_object(
    'totalCost', ROUND((ps.total_payments_cost + iwp.total_items_cost)::NUMERIC, 2),
    'totalPaid', ROUND(ist.total_paid::NUMERIC, 2),
    'totalRemaining', ROUND(GREATEST(0, (ps.total_payments_cost + iwp.total_items_cost) - ist.total_paid)::NUMERIC, 2),
    'percentPaid', CASE
      WHEN (ps.total_payments_cost + iwp.total_items_cost) > 0
      THEN ROUND((ist.total_paid / (ps.total_payments_cost + iwp.total_items_cost) * 100)::NUMERIC, 2)
      ELSE 0
    END,
    'nextDueDate', ist.next_due_date,
    'overdueCount', COALESCE(ist.overdue_count, 0),
    'lastDueDate', ist.last_due_date,
    'monthsRemaining', CASE
      WHEN ist.last_due_date IS NOT NULL
      THEN GREATEST(0, EXTRACT(YEAR FROM age(ist.last_due_date, CURRENT_DATE)) * 12 + EXTRACT(MONTH FROM age(ist.last_due_date, CURRENT_DATE)))
      ELSE 0
    END
  ) INTO result
  FROM payment_stats ps, items_without_payment iwp, installment_stats ist;

  RETURN result;
END;
$$;

-- ============================================================
-- 6. Database Function: create_payment_with_installments (transacional)
-- Cria pagamento + parcelas numa única transação.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_payment_with_installments(
  p_payment JSON,
  p_first_due_date DATE,
  p_owner_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment public.payments;
  v_total_amount NUMERIC;
  v_installment_amount NUMERIC;
  v_remaining NUMERIC;
  v_due_date DATE;
  v_i INTEGER;
BEGIN
  -- 1. Inserir pagamento
  INSERT INTO public.payments (
    project_id, owner_id, description, category, payment_method,
    total_amount, is_installment, num_installments, has_interest,
    interest_rate, total_with_interest, item_id, supplier_id, quote_id, note
  )
  VALUES (
    (p_payment->>'project_id')::UUID,
    p_owner_id,
    p_payment->>'description',
    COALESCE(p_payment->>'category', 'material'),
    (p_payment->>'payment_method')::payment_method,
    (p_payment->>'total_amount')::NUMERIC,
    COALESCE((p_payment->>'is_installment')::BOOLEAN, false),
    COALESCE((p_payment->>'num_installments')::INTEGER, 1),
    COALESCE((p_payment->>'has_interest')::BOOLEAN, false),
    COALESCE((p_payment->>'interest_rate')::NUMERIC, 0),
    NULLIF(p_payment->>'total_with_interest', '')::NUMERIC,
    NULLIF(p_payment->>'item_id', '')::UUID,
    NULLIF(p_payment->>'supplier_id', '')::UUID,
    NULLIF(p_payment->>'quote_id', '')::UUID,
    p_payment->>'note'
  )
  RETURNING * INTO v_payment;

  -- 2. Calcular e inserir parcelas
  v_total_amount := COALESCE(v_payment.total_with_interest, v_payment.total_amount);
  v_installment_amount := ROUND(v_total_amount / v_payment.num_installments, 2);
  v_remaining := v_total_amount;

  FOR v_i IN 1..v_payment.num_installments LOOP
    v_due_date := p_first_due_date + ((v_i - 1) * INTERVAL '1 month')::INTERVAL;

    INSERT INTO public.installments (
      payment_id, owner_id, installment_number, amount,
      due_date, status
    )
    VALUES (
      v_payment.id,
      p_owner_id,
      v_i,
      CASE WHEN v_i = v_payment.num_installments THEN ROUND(v_remaining, 2) ELSE v_installment_amount END,
      v_due_date,
      'pending'
    );

    v_remaining := v_remaining - v_installment_amount;
  END LOOP;

  RETURN row_to_json(v_payment);
END;
$$;

-- ============================================================
-- 7. Alterar file_size para BIGINT (futuro-proof)
-- ============================================================
ALTER TABLE public.documents ALTER COLUMN file_size TYPE BIGINT;

-- ============================================================
-- 8. RLS: Criar view pública de profiles (campos limitados)
-- Ao invés de expor todos os campos via profiles_select_public,
-- usar esta view para queries públicas.
-- ============================================================
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  city,
  state,
  specialty,
  company_name
FROM public.profiles;
