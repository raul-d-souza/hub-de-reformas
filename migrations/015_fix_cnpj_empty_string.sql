-- ============================================================
-- Migration 015: Fix CNPJ empty string → NULL
--
-- Problema: handle_new_user() insere '' (string vazia) quando
-- o usuário não informa CNPJ. O unique index idx_profiles_cnpj_unique
-- trata '' como valor (não é NULL), causando duplicate key error
-- no signup de novos usuários.
--
-- Solução:
-- 1. Converter '' existentes em NULL
-- 2. Corrigir handle_new_user() para usar NULLIF
-- ============================================================

-- 1. Corrigir dados existentes: '' → NULL
UPDATE public.profiles
SET cnpj = NULL
WHERE cnpj = '';

-- 2. Recriar função handle_new_user com NULLIF para CNPJ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, company_name, specialty, cnpj)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'company_name', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'specialty', '')), ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'cnpj', ''), '[^0-9]', '', 'g'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
