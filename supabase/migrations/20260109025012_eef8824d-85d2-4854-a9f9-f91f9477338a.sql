-- 1. Criar tabela de custos diretos do projeto (materiais, serviços, etc.)
CREATE TABLE public.custos_diretos_projeto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('MATERIAL', 'SERVICO', 'OUTRO')),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  fornecedor TEXT,
  documento TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.custos_diretos_projeto ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users with roles can view custos_diretos_projeto"
ON public.custos_diretos_projeto FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert custos_diretos_projeto"
ON public.custos_diretos_projeto FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update custos_diretos_projeto"
ON public.custos_diretos_projeto FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete custos_diretos_projeto"
ON public.custos_diretos_projeto FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_custos_diretos_projeto_updated_at
BEFORE UPDATE ON public.custos_diretos_projeto
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Criar view consolidada de custos por projeto
CREATE OR REPLACE VIEW public.vw_custo_projeto
WITH (security_invoker = true) AS
SELECT 
  p.id as projeto_id,
  p.nome as projeto_nome,
  p.os as projeto_os,
  e.empresa as empresa_nome,
  
  -- Custo de mão de obra (apenas registros com status OK)
  COALESCE(mo.total_custo_mo, 0) as custo_mao_obra,
  COALESCE(mo.total_horas, 0) as horas_totais,
  CASE WHEN COALESCE(mo.total_horas, 0) > 0 
    THEN ROUND(COALESCE(mo.total_custo_mo, 0) / mo.total_horas, 2)
    ELSE 0 
  END as custo_medio_hora,
  COALESCE(mo.registros_ok, 0) as registros_mo_ok,
  COALESCE(mo.registros_sem_custo, 0) as registros_sem_custo,
  
  -- Custos diretos por tipo
  COALESCE(cd.custo_material, 0) as custo_material,
  COALESCE(cd.custo_servico, 0) as custo_servico,
  COALESCE(cd.custo_outro, 0) as custo_outro,
  COALESCE(cd.total_custos_diretos, 0) as total_custos_diretos,
  
  -- Total geral
  COALESCE(mo.total_custo_mo, 0) + COALESCE(cd.total_custos_diretos, 0) as custo_total

FROM public.projetos p
JOIN public.empresas e ON e.id = p.empresa_id

-- Agregação de custos de mão de obra
LEFT JOIN (
  SELECT 
    projeto_id,
    SUM(custo_total) as total_custo_mo,
    SUM(horas_normais + horas_50 + horas_100 + horas_noturnas) as total_horas,
    COUNT(*) FILTER (WHERE status = 'OK') as registros_ok,
    COUNT(*) FILTER (WHERE status = 'SEM_CUSTO') as registros_sem_custo
  FROM public.custo_projeto_dia
  GROUP BY projeto_id
) mo ON mo.projeto_id = p.id

-- Agregação de custos diretos
LEFT JOIN (
  SELECT 
    projeto_id,
    SUM(valor) FILTER (WHERE tipo = 'MATERIAL') as custo_material,
    SUM(valor) FILTER (WHERE tipo = 'SERVICO') as custo_servico,
    SUM(valor) FILTER (WHERE tipo = 'OUTRO') as custo_outro,
    SUM(valor) as total_custos_diretos
  FROM public.custos_diretos_projeto
  GROUP BY projeto_id
) cd ON cd.projeto_id = p.id

WHERE p.status = 'ativo';

-- Grant access
GRANT SELECT ON public.vw_custo_projeto TO authenticated;
GRANT SELECT ON public.custos_diretos_projeto TO authenticated;