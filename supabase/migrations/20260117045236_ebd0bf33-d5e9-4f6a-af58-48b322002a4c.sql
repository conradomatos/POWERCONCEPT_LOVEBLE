-- ============================================
-- PROJETO GOVERNANCE ENHANCEMENT MIGRATION
-- ============================================

-- 1) Create enums for project governance
CREATE TYPE public.tipo_contrato AS ENUM ('PRECO_FECHADO', 'MAO_DE_OBRA');
CREATE TYPE public.status_projeto AS ENUM ('ATIVO', 'CONCLUIDO', 'SUSPENSO', 'CANCELADO');
CREATE TYPE public.aprovacao_status AS ENUM ('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'REPROVADO');
CREATE TYPE public.nivel_risco AS ENUM ('BAIXO', 'MEDIO', 'ALTO');

-- 2) Add new columns to projetos table
ALTER TABLE public.projetos
  -- Identification and governance
  ADD COLUMN IF NOT EXISTS tipo_contrato tipo_contrato,
  ADD COLUMN IF NOT EXISTS status_projeto status_projeto DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS aprovacao_status aprovacao_status DEFAULT 'APROVADO',
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS solicitado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT,
  
  -- Commercial and financial
  ADD COLUMN IF NOT EXISTS valor_contrato NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regua_projeto_valor NUMERIC DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS tem_aditivos BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_aditivos_previsto NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes_aditivos TEXT,
  
  -- Dates
  ADD COLUMN IF NOT EXISTS data_inicio_planejada DATE,
  ADD COLUMN IF NOT EXISTS data_fim_planejada DATE,
  ADD COLUMN IF NOT EXISTS data_inicio_real DATE,
  ADD COLUMN IF NOT EXISTS data_fim_real DATE,
  
  -- Risks
  ADD COLUMN IF NOT EXISTS risco_escopo nivel_risco DEFAULT 'MEDIO',
  ADD COLUMN IF NOT EXISTS risco_liberacao_cliente nivel_risco DEFAULT 'MEDIO',
  ADD COLUMN IF NOT EXISTS observacoes_riscos TEXT,
  
  -- System flag for special projects
  ADD COLUMN IF NOT EXISTS is_sistema BOOLEAN DEFAULT false;

-- 3) Update generate_next_os function to use AA+sequence format
CREATE OR REPLACE FUNCTION public.generate_next_os()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  year_prefix TEXT;
  next_num INTEGER;
  max_os TEXT;
BEGIN
  -- Get current 2-digit year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  year_prefix := RIGHT(current_year, 2);
  
  -- Find the max OS for current year prefix
  SELECT MAX(os) INTO max_os
  FROM public.projetos
  WHERE os ~ ('^' || year_prefix || '\d+$');
  
  IF max_os IS NULL THEN
    -- No OS for this year yet, start at 001
    next_num := 1;
  ELSE
    -- Extract the numeric part after the year prefix and increment
    next_num := SUBSTRING(max_os FROM 3)::INTEGER + 1;
  END IF;
  
  -- Return format: YY + 3 digit sequence (e.g., 26001)
  RETURN year_prefix || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- 4) Insert the fixed ORÇAMENTOS project
-- First ensure there's a system company
INSERT INTO public.empresas (empresa, razao_social, codigo, segmento, unidade, status)
VALUES ('Sistema Comercial', 'Centro de Custos Comercial', 'COM', 'SISTEMA', 'GERAL', 'ativo')
ON CONFLICT DO NOTHING;

-- Insert ORÇAMENTOS project with reserved OS 'ORC'
DO $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas WHERE codigo = 'COM';
  
  IF v_empresa_id IS NULL THEN
    -- Fallback to SYS if COM doesn't exist
    SELECT id INTO v_empresa_id FROM public.empresas WHERE codigo = 'SYS';
  END IF;
  
  IF v_empresa_id IS NOT NULL THEN
    INSERT INTO public.projetos (
      empresa_id, 
      nome, 
      descricao, 
      status, 
      os,
      tipo_contrato,
      status_projeto,
      aprovacao_status,
      valor_contrato,
      is_sistema
    )
    VALUES (
      v_empresa_id, 
      'ORÇAMENTOS', 
      'Centro de custo para despesas comerciais de orçamentos/viagens/visitas antes do projeto ser ganho', 
      'ativo',
      'ORC',
      'MAO_DE_OBRA',
      'ATIVO',
      'APROVADO',
      0,
      true
    )
    ON CONFLICT (os) DO NOTHING;
  END IF;
END $$;

-- 5) Create trigger to prevent deletion/modification of system projects
CREATE OR REPLACE FUNCTION public.protect_sistema_projects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_sistema = true THEN
      RAISE EXCEPTION 'Não é possível excluir projetos do sistema';
    END IF;
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_sistema = true THEN
      -- Prevent changing system flag or OS on system projects
      IF NEW.is_sistema != OLD.is_sistema OR NEW.os != OLD.os THEN
        RAISE EXCEPTION 'Não é possível alterar projetos do sistema';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sistema_projects_trigger ON public.projetos;
CREATE TRIGGER protect_sistema_projects_trigger
  BEFORE UPDATE OR DELETE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sistema_projects();

-- 6) Create function to check if user can approve projects
CREATE OR REPLACE FUNCTION public.can_approve_projects(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- 7) Migrate existing status to new status_projeto enum
UPDATE public.projetos
SET status_projeto = CASE 
  WHEN status = 'ativo' THEN 'ATIVO'::status_projeto
  WHEN status = 'inativo' THEN 'SUSPENSO'::status_projeto
  ELSE 'ATIVO'::status_projeto
END
WHERE status_projeto IS NULL;