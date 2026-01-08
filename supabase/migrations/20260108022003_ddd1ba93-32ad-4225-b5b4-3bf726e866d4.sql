-- Create enum for allocation type
CREATE TYPE public.alocacao_tipo AS ENUM ('planejado', 'realizado');

-- Create alocacoes_blocos table (Gantt blocks)
CREATE TABLE public.alocacoes_blocos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE RESTRICT,
  tipo public.alocacao_tipo NOT NULL DEFAULT 'planejado',
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  prioridade INTEGER DEFAULT 1,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  
  CONSTRAINT alocacoes_blocos_datas_check CHECK (data_fim >= data_inicio)
);

-- Create alocacoes_padrao table (default allocations)
CREATE TABLE public.alocacoes_padrao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE RESTRICT,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  
  CONSTRAINT alocacoes_padrao_datas_check CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Enable RLS
ALTER TABLE public.alocacoes_blocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alocacoes_padrao ENABLE ROW LEVEL SECURITY;

-- RLS policies for alocacoes_blocos
CREATE POLICY "Authenticated users with roles can view alocacoes_blocos"
ON public.alocacoes_blocos FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert alocacoes_blocos"
ON public.alocacoes_blocos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update alocacoes_blocos"
ON public.alocacoes_blocos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete alocacoes_blocos"
ON public.alocacoes_blocos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for alocacoes_padrao
CREATE POLICY "Authenticated users with roles can view alocacoes_padrao"
ON public.alocacoes_padrao FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert alocacoes_padrao"
ON public.alocacoes_padrao FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update alocacoes_padrao"
ON public.alocacoes_padrao FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete alocacoes_padrao"
ON public.alocacoes_padrao FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_alocacoes_blocos_updated_at
  BEFORE UPDATE ON public.alocacoes_blocos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alocacoes_padrao_updated_at
  BEFORE UPDATE ON public.alocacoes_padrao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_alocacoes_blocos_colaborador ON public.alocacoes_blocos(colaborador_id);
CREATE INDEX idx_alocacoes_blocos_projeto ON public.alocacoes_blocos(projeto_id);
CREATE INDEX idx_alocacoes_blocos_datas ON public.alocacoes_blocos(data_inicio, data_fim);
CREATE INDEX idx_alocacoes_blocos_tipo ON public.alocacoes_blocos(tipo);

CREATE INDEX idx_alocacoes_padrao_colaborador ON public.alocacoes_padrao(colaborador_id);
CREATE INDEX idx_alocacoes_padrao_projeto ON public.alocacoes_padrao(projeto_id);
CREATE INDEX idx_alocacoes_padrao_datas ON public.alocacoes_padrao(data_inicio, data_fim);

-- Validation trigger for alocacoes_blocos
CREATE OR REPLACE FUNCTION public.validate_alocacao_bloco()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
  
  -- Check for overlapping blocks of same type
  SELECT id, data_inicio, data_fim INTO v_overlap_record
  FROM public.alocacoes_blocos
  WHERE colaborador_id = NEW.colaborador_id
    AND tipo = NEW.tipo
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND data_inicio <= NEW.data_fim
    AND data_fim >= NEW.data_inicio
  LIMIT 1;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Existe alocação sobreposta no período % – %', v_overlap_record.data_inicio, v_overlap_record.data_fim;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_alocacao_bloco_trigger
  BEFORE INSERT OR UPDATE ON public.alocacoes_blocos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_alocacao_bloco();

-- Validation trigger for alocacoes_padrao
CREATE OR REPLACE FUNCTION public.validate_alocacao_padrao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_overlap_record RECORD;
BEGIN
  -- Check for overlapping default allocations
  SELECT id, data_inicio, data_fim INTO v_overlap_record
  FROM public.alocacoes_padrao
  WHERE colaborador_id = NEW.colaborador_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND data_inicio <= COALESCE(NEW.data_fim, '9999-12-31'::date)
    AND COALESCE(data_fim, '9999-12-31'::date) >= NEW.data_inicio
  LIMIT 1;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Existe alocação padrão sobreposta no período % – %', v_overlap_record.data_inicio, COALESCE(v_overlap_record.data_fim::text, 'vigente');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_alocacao_padrao_trigger
  BEFORE INSERT OR UPDATE ON public.alocacoes_padrao
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_alocacao_padrao();

-- Function to get allocation for a specific date and collaborator
CREATE OR REPLACE FUNCTION public.get_alocacao_por_data(
  p_colaborador_id UUID,
  p_data DATE,
  p_tipo alocacao_tipo DEFAULT 'realizado'
)
RETURNS TABLE(
  id UUID,
  projeto_id UUID,
  projeto_nome TEXT,
  projeto_codigo TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ab.id,
    ab.projeto_id,
    p.nome as projeto_nome,
    e.codigo as projeto_codigo
  FROM public.alocacoes_blocos ab
  JOIN public.projetos p ON p.id = ab.projeto_id
  JOIN public.empresas e ON e.id = p.empresa_id
  WHERE ab.colaborador_id = p_colaborador_id
    AND ab.tipo = p_tipo
    AND p_data BETWEEN ab.data_inicio AND ab.data_fim
  LIMIT 1;
$$;

-- Create special system projects for administrative purposes
INSERT INTO public.empresas (empresa, razao_social, codigo, segmento, unidade, status)
VALUES ('Sistema', 'Projetos do Sistema', 'SYS', 'SISTEMA', 'GERAL', 'ativo')
ON CONFLICT DO NOTHING;

-- Insert special projects (linked to system company)
DO $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas WHERE codigo = 'SYS';
  
  IF v_empresa_id IS NOT NULL THEN
    INSERT INTO public.projetos (empresa_id, nome, descricao, status)
    VALUES 
      (v_empresa_id, 'ADMINISTRATIVO', 'Atividades administrativas internas', 'ativo'),
      (v_empresa_id, 'TREINAMENTO', 'Treinamentos e capacitações', 'ativo'),
      (v_empresa_id, 'FÉRIAS', 'Período de férias', 'ativo'),
      (v_empresa_id, 'AFASTAMENTO', 'Afastamentos médicos e licenças', 'ativo')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;