
-- Create enum for custo status
CREATE TYPE public.custo_status AS ENUM ('OK', 'SEM_CUSTO');

-- Create table apontamentos_horas_dia
CREATE TABLE public.apontamentos_horas_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL,
  colaborador_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  os TEXT NOT NULL,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  horas_normais NUMERIC NOT NULL DEFAULT 0.00,
  horas_50 NUMERIC NOT NULL DEFAULT 0.00,
  horas_100 NUMERIC NOT NULL DEFAULT 0.00,
  horas_noturnas NUMERIC NOT NULL DEFAULT 0.00,
  falta_horas NUMERIC NOT NULL DEFAULT 0.00,
  warning_sem_custo BOOLEAN NOT NULL DEFAULT false,
  fonte TEXT NOT NULL DEFAULT 'CSV',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (cpf, data, projeto_id)
);

-- Create table custo_projeto_dia
CREATE TABLE public.custo_projeto_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL,
  colaborador_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  custo_hora NUMERIC,
  horas_normais NUMERIC NOT NULL DEFAULT 0.00,
  horas_50 NUMERIC NOT NULL DEFAULT 0.00,
  horas_100 NUMERIC NOT NULL DEFAULT 0.00,
  horas_noturnas NUMERIC NOT NULL DEFAULT 0.00,
  falta_horas NUMERIC NOT NULL DEFAULT 0.00,
  custo_normal NUMERIC,
  custo_50 NUMERIC,
  custo_100 NUMERIC,
  custo_noturno NUMERIC,
  custo_total NUMERIC,
  status public.custo_status NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (cpf, data, projeto_id)
);

-- Enable RLS
ALTER TABLE public.apontamentos_horas_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custo_projeto_dia ENABLE ROW LEVEL SECURITY;

-- RLS policies for apontamentos_horas_dia
CREATE POLICY "Authenticated users with roles can view apontamentos" 
ON public.apontamentos_horas_dia FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert apontamentos" 
ON public.apontamentos_horas_dia FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update apontamentos" 
ON public.apontamentos_horas_dia FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete apontamentos" 
ON public.apontamentos_horas_dia FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for custo_projeto_dia
CREATE POLICY "Authenticated users with roles can view custo_projeto_dia" 
ON public.custo_projeto_dia FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert custo_projeto_dia" 
ON public.custo_projeto_dia FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update custo_projeto_dia" 
ON public.custo_projeto_dia FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete custo_projeto_dia" 
ON public.custo_projeto_dia FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_apontamentos_horas_dia_updated_at
BEFORE UPDATE ON public.apontamentos_horas_dia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custo_projeto_dia_updated_at
BEFORE UPDATE ON public.custo_projeto_dia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
