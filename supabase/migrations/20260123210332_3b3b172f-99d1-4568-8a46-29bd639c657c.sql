-- Phase 3: Histogram, Cashflow Schedule, and Documents tables

-- 1. Budget Histogram - Monthly HH distribution by labor role
CREATE TABLE public.budget_histogram (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  labor_role_id uuid NOT NULL REFERENCES public.labor_roles(id) ON DELETE CASCADE,
  mes_ref date NOT NULL, -- first day of month
  hh_normais numeric NOT NULL DEFAULT 0,
  hh_50 numeric NOT NULL DEFAULT 0,
  hh_100 numeric NOT NULL DEFAULT 0,
  hh_total numeric NOT NULL DEFAULT 0,
  custo_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(revision_id, labor_role_id, mes_ref)
);

-- 2. Cashflow Schedule - Monthly cost projections by category
CREATE TABLE public.cashflow_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  mes_ref date NOT NULL, -- first day of month
  categoria text NOT NULL, -- 'MATERIAIS', 'MO', 'MOBILIZACAO', 'CANTEIRO', 'EQUIPAMENTOS', 'ENGENHARIA'
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(revision_id, mes_ref, categoria)
);

-- 3. Budget Documents - PDF and other generated documents
CREATE TABLE public.budget_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'PROPOSTA', -- 'PROPOSTA', 'ANEXO', 'MEMORIA'
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.budget_histogram ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_histogram
CREATE POLICY "Usuários autenticados podem ver budget_histogram"
  ON public.budget_histogram FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar budget_histogram"
  ON public.budget_histogram FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for cashflow_schedule
CREATE POLICY "Usuários autenticados podem ver cashflow_schedule"
  ON public.cashflow_schedule FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar cashflow_schedule"
  ON public.cashflow_schedule FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for budget_documents
CREATE POLICY "Usuários autenticados podem ver budget_documents"
  ON public.budget_documents FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar budget_documents"
  ON public.budget_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger to calculate histogram totals
CREATE OR REPLACE FUNCTION public.calculate_histogram_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_custo_normal NUMERIC := 0;
  v_custo_he50 NUMERIC := 0;
  v_custo_he100 NUMERIC := 0;
BEGIN
  -- Get cost rates from snapshot
  SELECT custo_hora_normal, custo_hora_he50, custo_hora_he100
  INTO v_custo_normal, v_custo_he50, v_custo_he100
  FROM public.labor_cost_snapshot
  WHERE labor_role_id = NEW.labor_role_id AND revision_id = NEW.revision_id;
  
  NEW.hh_total := NEW.hh_normais + NEW.hh_50 + NEW.hh_100;
  NEW.custo_total := (NEW.hh_normais * COALESCE(v_custo_normal, 0)) + 
                     (NEW.hh_50 * COALESCE(v_custo_he50, 0)) + 
                     (NEW.hh_100 * COALESCE(v_custo_he100, 0));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_histogram_totals
  BEFORE INSERT OR UPDATE ON public.budget_histogram
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_histogram_totals();