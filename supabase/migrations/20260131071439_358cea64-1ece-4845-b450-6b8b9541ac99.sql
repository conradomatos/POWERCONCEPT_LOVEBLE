-- =====================================================
-- Security Hardening Migration
-- Fixes: profiles_table_exposure, omie_financial_tables
-- =====================================================

-- =====================================================
-- 1. FIX PROFILES TABLE RLS - Restrict to own profile + admin/rh
-- =====================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;

-- Create restrictive policy: users see own profile, admin/rh see all
CREATE POLICY "Users can view own profile or admin/rh can view all"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'rh'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- =====================================================
-- 2. FIX OMIE FINANCIAL TABLES - Restrict to admin/financeiro only
-- =====================================================

-- Drop overly permissive policies on omie_contas_pagar
DROP POLICY IF EXISTS "Authenticated users with roles can view omie_contas_pagar" ON public.omie_contas_pagar;

-- Create restrictive policy for omie_contas_pagar
CREATE POLICY "Admin and Financeiro can view contas pagar"
  ON public.omie_contas_pagar FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'financeiro'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Drop overly permissive policies on omie_contas_receber
DROP POLICY IF EXISTS "Authenticated users with roles can view omie_contas_receber" ON public.omie_contas_receber;

-- Create restrictive policy for omie_contas_receber
CREATE POLICY "Admin and Financeiro can view contas receber"
  ON public.omie_contas_receber FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'financeiro'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- =====================================================
-- 3. FIX validate_alocacao_bloco FUNCTION - Add search_path
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_alocacao_bloco()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hire_date DATE;
  v_termination_date DATE;
  v_overlap_record RECORD;
BEGIN
  -- Get collaborator dates
  SELECT hire_date, termination_date INTO v_hire_date, v_termination_date
  FROM public.collaborators
  WHERE id = NEW.colaborador_id;
  
  -- Validate against collaborator's employment period
  IF NEW.data_inicio < v_hire_date THEN
    RAISE EXCEPTION 'Data de início (%) é anterior à data de admissão do colaborador (%)', NEW.data_inicio, v_hire_date;
  END IF;
  
  IF v_termination_date IS NOT NULL AND NEW.data_inicio > v_termination_date THEN
    RAISE EXCEPTION 'Data de início (%) é posterior à data de desligamento do colaborador (%)', NEW.data_inicio, v_termination_date;
  END IF;
  
  -- Check for overlapping blocks of same type AND same project
  SELECT id, data_inicio, data_fim INTO v_overlap_record
  FROM public.alocacoes_blocos
  WHERE colaborador_id = NEW.colaborador_id
    AND tipo = NEW.tipo
    AND projeto_id = NEW.projeto_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND data_inicio <= NEW.data_fim
    AND data_fim >= NEW.data_inicio
  LIMIT 1;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Existe alocação sobreposta no período % - %', v_overlap_record.data_inicio, v_overlap_record.data_fim;
  END IF;
  
  RETURN NEW;
END;
$function$;