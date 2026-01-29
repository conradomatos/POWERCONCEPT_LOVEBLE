-- ============================================================
-- Fix overly permissive RLS policies on allocation ratio tables
-- Restrict access to admin and rh roles only
-- ============================================================

-- 1. Drop existing overly permissive policies
DROP POLICY IF EXISTS "p_auth_all" ON public.alocacoes_blocos_rateio;
DROP POLICY IF EXISTS "p_auth_all" ON public.alocacoes_padrao_rateio;

-- 2. Create proper role-scoped policies for alocacoes_blocos_rateio
CREATE POLICY "Admin and RH can view allocation ratios"
  ON public.alocacoes_blocos_rateio
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin and RH can insert allocation ratios"
  ON public.alocacoes_blocos_rateio
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin and RH can update allocation ratios"
  ON public.alocacoes_blocos_rateio
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin and RH can delete allocation ratios"
  ON public.alocacoes_blocos_rateio
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 3. Create proper role-scoped policies for alocacoes_padrao_rateio
CREATE POLICY "Admin and RH can view default allocation ratios"
  ON public.alocacoes_padrao_rateio
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin and RH can insert default allocation ratios"
  ON public.alocacoes_padrao_rateio
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin and RH can update default allocation ratios"
  ON public.alocacoes_padrao_rateio
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin and RH can delete default allocation ratios"
  ON public.alocacoes_padrao_rateio
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );