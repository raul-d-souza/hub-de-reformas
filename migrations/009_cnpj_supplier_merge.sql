-- ============================================================
-- Migration 009: CNPJ como chave de deduplicação de fornecedores
-- Resolve o problema de duplicação quando um cliente cadastra um
-- fornecedor manualmente e depois o mesmo fornecedor cria sua conta.
-- O CNPJ é usado como chave forte para vincular registros.
-- ============================================================

-- 1. Adicionar coluna CNPJ à tabela suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- 2. Adicionar coluna CNPJ ao profile (fornecedor preenche no signup)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- 3. Índice único parcial: só um supplier "canônico" por CNPJ
--    (permite NULL, mas se preenchido deve ser único entre os que têm user_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_cnpj_unique
  ON public.suppliers(cnpj)
  WHERE cnpj IS NOT NULL AND user_id IS NOT NULL;

-- 4. Índice para busca por CNPJ (para o merge)
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj
  ON public.suppliers(cnpj)
  WHERE cnpj IS NOT NULL;

-- 5. Índice para CNPJ no profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cnpj_unique
  ON public.profiles(cnpj)
  WHERE cnpj IS NOT NULL;

-- ============================================================
-- 6. Função: merge_supplier_by_cnpj
-- Quando um fornecedor cria sua conta (signup como supplier),
-- esta função busca todos os registros de suppliers que foram
-- cadastrados por clientes com o mesmo CNPJ e faz o merge:
--   - Atualiza o user_id de todos eles para apontar pro novo usuário
--   - Enriquece os dados (nome, contato, etc.) se estiverem vazios
-- ============================================================
CREATE OR REPLACE FUNCTION public.merge_supplier_by_cnpj(
  p_user_id UUID,
  p_cnpj TEXT,
  p_company_name TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_canonical_supplier_id UUID;
  v_merged_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Nada a fazer se CNPJ não informado
  IF p_cnpj IS NULL OR TRIM(p_cnpj) = '' THEN
    RETURN json_build_object('merged', 0, 'canonical_supplier_id', NULL);
  END IF;

  -- Normalizar CNPJ (remover pontuação)
  p_cnpj := regexp_replace(p_cnpj, '[^0-9]', '', 'g');

  -- 1. Verificar se já existe um supplier "canônico" (com user_id) para este CNPJ
  SELECT id INTO v_canonical_supplier_id
  FROM public.suppliers
  WHERE cnpj = p_cnpj AND user_id IS NOT NULL
  LIMIT 1;

  -- 2. Se já existe supplier canônico, apenas vincular os órfãos
  IF v_canonical_supplier_id IS NOT NULL THEN
    -- Atualizar suppliers órfãos (sem user_id) que têm o mesmo CNPJ
    UPDATE public.suppliers
    SET user_id = p_user_id,
        updated_at = now()
    WHERE cnpj = p_cnpj AND user_id IS NULL;

    GET DIAGNOSTICS v_merged_count = ROW_COUNT;

    RETURN json_build_object(
      'merged', v_merged_count,
      'canonical_supplier_id', v_canonical_supplier_id
    );
  END IF;

  -- 3. Buscar o supplier criado pelo trigger on_supplier_profile_created
  --    (é o recém-criado, sem CNPJ ainda)
  SELECT id INTO v_canonical_supplier_id
  FROM public.suppliers
  WHERE user_id = p_user_id
  LIMIT 1;

  -- 4. Atualizar o supplier canônico com o CNPJ
  IF v_canonical_supplier_id IS NOT NULL THEN
    UPDATE public.suppliers
    SET cnpj = p_cnpj,
        updated_at = now()
    WHERE id = v_canonical_supplier_id;
  END IF;

  -- 5. Buscar suppliers órfãos com o mesmo CNPJ e reatribuir seus vínculos
  --    Transferir item_suppliers, quotes, invitations, bids, schedules, attendance
  IF v_canonical_supplier_id IS NOT NULL THEN
    -- item_suppliers: transferir para o supplier canônico
    UPDATE public.item_suppliers
    SET supplier_id = v_canonical_supplier_id, updated_at = now()
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    )
    -- Evitar duplicatas (mesmo item + supplier)
    AND NOT EXISTS (
      SELECT 1 FROM public.item_suppliers existing
      WHERE existing.item_id = item_suppliers.item_id
        AND existing.supplier_id = v_canonical_supplier_id
    );

    -- quotes: transferir para o supplier canônico
    UPDATE public.quotes
    SET supplier_id = v_canonical_supplier_id
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    );

    -- project_invitations: transferir
    UPDATE public.project_invitations
    SET supplier_id = v_canonical_supplier_id, updated_at = now()
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.project_invitations existing
      WHERE existing.project_id = project_invitations.project_id
        AND existing.supplier_id = v_canonical_supplier_id
    );

    -- project_bids: transferir
    UPDATE public.project_bids
    SET supplier_id = v_canonical_supplier_id, updated_at = now()
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    );

    -- supplier_schedules: transferir
    UPDATE public.supplier_schedules
    SET supplier_id = v_canonical_supplier_id, updated_at = now()
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.supplier_schedules existing
      WHERE existing.project_id = supplier_schedules.project_id
        AND existing.supplier_id = v_canonical_supplier_id
    );

    -- attendance_records: transferir
    UPDATE public.attendance_records
    SET supplier_id = v_canonical_supplier_id
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_records existing
      WHERE existing.project_id = attendance_records.project_id
        AND existing.supplier_id = v_canonical_supplier_id
        AND existing.date = attendance_records.date
    );

    -- payments: transferir referência ao supplier
    UPDATE public.payments
    SET supplier_id = v_canonical_supplier_id, updated_at = now()
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    );

    -- documents: transferir referência ao supplier
    UPDATE public.documents
    SET supplier_id = v_canonical_supplier_id, updated_at = now()
    WHERE supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL
    );

    -- Contar quantos suppliers órfãos serão removidos
    SELECT COUNT(*) INTO v_merged_count
    FROM public.suppliers
    WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL;

    -- Remover suppliers órfãos (agora sem dependências)
    DELETE FROM public.suppliers
    WHERE cnpj = p_cnpj AND id != v_canonical_supplier_id AND user_id IS NULL;
  END IF;

  RETURN json_build_object(
    'merged', v_merged_count,
    'canonical_supplier_id', v_canonical_supplier_id
  );
END;
$$;

-- ============================================================
-- 7. Atualizar handle_new_supplier_profile para incluir CNPJ
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_supplier_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_cnpj TEXT;
  v_existing_supplier_id UUID;
BEGIN
  IF NEW.role = 'supplier' THEN
    -- Normalizar CNPJ
    v_cnpj := regexp_replace(COALESCE(NEW.cnpj, ''), '[^0-9]', '', 'g');
    IF v_cnpj = '' THEN v_cnpj := NULL; END IF;

    -- Verificar se já existe um supplier com este CNPJ (cadastrado por um cliente)
    IF v_cnpj IS NOT NULL THEN
      SELECT id INTO v_existing_supplier_id
      FROM public.suppliers
      WHERE cnpj = v_cnpj AND user_id IS NULL
      LIMIT 1;
    END IF;

    IF v_existing_supplier_id IS NOT NULL THEN
      -- Reivindicar o supplier existente: associar ao novo user
      UPDATE public.suppliers
      SET user_id = NEW.id,
          owner_id = NEW.id,
          contact_name = COALESCE(contact_name, NEW.full_name),
          phone = COALESCE(phone, NEW.phone),
          name = COALESCE(NULLIF(name, ''), NEW.company_name, NEW.full_name),
          updated_at = now()
      WHERE id = v_existing_supplier_id;

      -- Executar merge completo para consolidar outros registros com mesmo CNPJ
      PERFORM public.merge_supplier_by_cnpj(
        NEW.id,
        v_cnpj,
        NEW.company_name,
        NEW.full_name,
        NEW.phone,
        ''
      );
    ELSE
      -- Criar novo supplier normalmente (com CNPJ se fornecido)
      INSERT INTO public.suppliers (name, contact_name, phone, email, owner_id, user_id, cnpj)
      VALUES (
        COALESCE(NEW.company_name, NEW.full_name),
        NEW.full_name,
        COALESCE(NEW.phone, ''),
        '',
        NEW.id,
        NEW.id,
        v_cnpj
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Atualizar handle_new_user para salvar CNPJ no profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, company_name, specialty, cnpj)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'),
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'specialty',
    regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'cnpj', ''), '[^0-9]', '', 'g')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Helper: função para validar CNPJ (dígitos verificadores)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_cnpj(p_cnpj TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cnpj TEXT;
  v_digits INTEGER[];
  v_sum INTEGER;
  v_rest INTEGER;
  v_d1 INTEGER;
  v_d2 INTEGER;
  v_weights_1 INTEGER[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  v_weights_2 INTEGER[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  i INTEGER;
BEGIN
  -- Remover formatação
  v_cnpj := regexp_replace(p_cnpj, '[^0-9]', '', 'g');

  -- Deve ter 14 dígitos
  IF length(v_cnpj) != 14 THEN RETURN FALSE; END IF;

  -- Não pode ser todos os dígitos iguais
  IF v_cnpj ~ '^(.)\1{13}$' THEN RETURN FALSE; END IF;

  -- Converter para array de inteiros
  FOR i IN 1..14 LOOP
    v_digits[i] := CAST(substring(v_cnpj FROM i FOR 1) AS INTEGER);
  END LOOP;

  -- Primeiro dígito verificador
  v_sum := 0;
  FOR i IN 1..12 LOOP
    v_sum := v_sum + v_digits[i] * v_weights_1[i];
  END LOOP;
  v_rest := v_sum % 11;
  v_d1 := CASE WHEN v_rest < 2 THEN 0 ELSE 11 - v_rest END;

  IF v_digits[13] != v_d1 THEN RETURN FALSE; END IF;

  -- Segundo dígito verificador
  v_sum := 0;
  FOR i IN 1..13 LOOP
    v_sum := v_sum + v_digits[i] * v_weights_2[i];
  END LOOP;
  v_rest := v_sum % 11;
  v_d2 := CASE WHEN v_rest < 2 THEN 0 ELSE 11 - v_rest END;

  IF v_digits[14] != v_d2 THEN RETURN FALSE; END IF;

  RETURN TRUE;
END;
$$;
