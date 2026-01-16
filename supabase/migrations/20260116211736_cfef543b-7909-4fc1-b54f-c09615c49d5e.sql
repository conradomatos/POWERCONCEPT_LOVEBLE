-- Tabela para modelo de encargos CLT
CREATE TABLE IF NOT EXISTS public.encargos_modelo_clt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- percentuais principais
  inss numeric(9,6) NOT NULL,           -- INSS patronal
  inss_a numeric(9,6) NOT NULL,         -- INSS adicional
  salario_educacao numeric(9,6) NOT NULL,
  fgts numeric(9,6) NOT NULL,
  fgts_a numeric(9,6) NOT NULL,
  ratsat numeric(9,6) NOT NULL,
  
  -- provisoes
  provisao_ferias numeric(9,6) NOT NULL,
  provisao_13 numeric(9,6) NOT NULL,
  fator_rescisao_fgts numeric(9,6) NOT NULL,
  
  -- metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.encargos_modelo_clt ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users with roles can view encargos_modelo_clt"
ON public.encargos_modelo_clt
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert encargos_modelo_clt"
ON public.encargos_modelo_clt
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update encargos_modelo_clt"
ON public.encargos_modelo_clt
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete encargos_modelo_clt"
ON public.encargos_modelo_clt
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_encargos_modelo_clt_updated_at
BEFORE UPDATE ON public.encargos_modelo_clt
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();