-- ============================================================
-- Migration 012: HOTFIX — Corrige signup de novos usuários
-- Erro: type "user_role" does not exist (SQLSTATE 42704)
--
-- Este script garante que:
-- 1. O tipo ENUM user_role existe
-- 2. A coluna role existe em profiles
-- 3. A coluna cnpj existe em profiles
-- 4. A função handle_new_user() está correta
-- 5. O trigger on_auth_user_created existe
--
-- Execute no SQL Editor do Supabase (produção).
-- ============================================================

-- 1. Criar tipo user_role se não existir
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('client', 'supplier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Garantir colunas necessárias em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'client';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- 3. Recriar função handle_new_user com referência explícita ao schema public
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, company_name, specialty, cnpj)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'),
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'specialty',
    regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'cnpj', ''), '[^0-9]', '', 'g')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
