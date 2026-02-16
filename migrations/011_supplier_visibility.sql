-- ============================================================
-- Migration 011: Supplier Visibility — Fornecedores privados
--
-- Regras de visibilidade:
-- 1. Fornecedores criados pelo usuário (owner_id) → visíveis apenas para o dono
-- 2. Fornecedores com conta ativa (user_id IS NOT NULL) → visíveis publicamente no marketplace
-- 3. Fornecedor logado pode ver/editar o próprio perfil
-- ============================================================

-- Remover política de leitura pública irrestrita
DROP POLICY IF EXISTS "suppliers_select_public" ON public.suppliers;

-- Nova política: leitura pública apenas para fornecedores com conta ativa (verificados)
CREATE POLICY "suppliers_select_verified_public" ON public.suppliers
  FOR SELECT USING (
    user_id IS NOT NULL  -- Fornecedor com conta ativa → visível no marketplace
    OR owner_id = auth.uid()  -- Fornecedor criado pelo usuário → visível para o dono
  );

