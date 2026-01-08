
-- Create table custos_colaborador
CREATE TABLE public.custos_colaborador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  
  -- Campos de custo (mensais)
  salario_base DECIMAL(12,2) NOT NULL CHECK (salario_base >= 0),
  periculosidade BOOLEAN NOT NULL DEFAULT false,
  vale_refeicao DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (vale_refeicao >= 0),
  vale_alimentacao DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (vale_alimentacao >= 0),
  vale_transporte DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (vale_transporte >= 0),
  ajuda_custo DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (ajuda_custo >= 0),
  plano_saude DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (plano_saude >= 0),
  
  -- Vigência
  inicio_vigencia DATE NOT NULL,
  fim_vigencia DATE,
  
  -- Campos auxiliares
  motivo_alteracao TEXT,
  classificacao TEXT,
  observacao TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.custos_colaborador ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users with roles can view custos"
ON public.custos_colaborador
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert custos"
ON public.custos_colaborador
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update custos"
ON public.custos_colaborador
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete custos"
ON public.custos_colaborador
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_custos_colaborador_updated_at
BEFORE UPDATE ON public.custos_colaborador
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: fim_vigencia >= inicio_vigencia
CREATE OR REPLACE FUNCTION public.validate_custo_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check fim_vigencia >= inicio_vigencia
  IF NEW.fim_vigencia IS NOT NULL AND NEW.fim_vigencia < NEW.inicio_vigencia THEN
    RAISE EXCEPTION 'fim_vigencia deve ser maior ou igual a inicio_vigencia';
  END IF;
  
  -- Check for overlapping periods
  IF EXISTS (
    SELECT 1 FROM public.custos_colaborador
    WHERE colaborador_id = NEW.colaborador_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- New record overlaps with existing
        (NEW.fim_vigencia IS NULL AND (fim_vigencia IS NULL OR fim_vigencia >= NEW.inicio_vigencia))
        OR
        (NEW.fim_vigencia IS NOT NULL AND fim_vigencia IS NULL AND inicio_vigencia <= NEW.fim_vigencia)
        OR
        (NEW.fim_vigencia IS NOT NULL AND fim_vigencia IS NOT NULL 
          AND inicio_vigencia <= NEW.fim_vigencia AND fim_vigencia >= NEW.inicio_vigencia)
      )
  ) THEN
    RAISE EXCEPTION 'Já existe um registro de custo com vigência sobreposta para este colaborador';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_custo_colaborador_dates
BEFORE INSERT OR UPDATE ON public.custos_colaborador
FOR EACH ROW
EXECUTE FUNCTION public.validate_custo_dates();

-- Function to get custo vigente by date
CREATE OR REPLACE FUNCTION public.get_custo_vigente(
  p_colaborador_id UUID,
  p_data_referencia DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  colaborador_id UUID,
  salario_base DECIMAL,
  periculosidade BOOLEAN,
  vale_refeicao DECIMAL,
  vale_alimentacao DECIMAL,
  vale_transporte DECIMAL,
  ajuda_custo DECIMAL,
  plano_saude DECIMAL,
  inicio_vigencia DATE,
  fim_vigencia DATE,
  motivo_alteracao TEXT,
  classificacao TEXT,
  observacao TEXT,
  beneficios DECIMAL,
  adicional_periculosidade DECIMAL,
  custo_mensal_total DECIMAL,
  custo_hora DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.colaborador_id,
    c.salario_base,
    c.periculosidade,
    c.vale_refeicao,
    c.vale_alimentacao,
    c.vale_transporte,
    c.ajuda_custo,
    c.plano_saude,
    c.inicio_vigencia,
    c.fim_vigencia,
    c.motivo_alteracao,
    c.classificacao,
    c.observacao,
    (c.vale_refeicao + c.vale_alimentacao + c.vale_transporte + c.ajuda_custo + c.plano_saude) as beneficios,
    CASE WHEN c.periculosidade THEN c.salario_base * 0.30 ELSE 0 END as adicional_periculosidade,
    (c.salario_base + CASE WHEN c.periculosidade THEN c.salario_base * 0.30 ELSE 0 END + 
     c.vale_refeicao + c.vale_alimentacao + c.vale_transporte + c.ajuda_custo + c.plano_saude) as custo_mensal_total,
    ROUND(
      (c.salario_base + CASE WHEN c.periculosidade THEN c.salario_base * 0.30 ELSE 0 END + 
       c.vale_refeicao + c.vale_alimentacao + c.vale_transporte + c.ajuda_custo + c.plano_saude) / 220, 2
    ) as custo_hora
  FROM public.custos_colaborador c
  WHERE c.colaborador_id = p_colaborador_id
    AND c.inicio_vigencia <= p_data_referencia
    AND (c.fim_vigencia IS NULL OR c.fim_vigencia >= p_data_referencia)
  LIMIT 1;
$$;

-- Create index for performance
CREATE INDEX idx_custos_colaborador_vigencia ON public.custos_colaborador(colaborador_id, inicio_vigencia, fim_vigencia);
