-- =============================================
-- SISTEMA DE APONTAMENTO DIÁRIO
-- =============================================

-- 1. Enum para status do dia
CREATE TYPE apontamento_dia_status AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'BLOQUEADO');

-- 2. Enum para fonte base das horas
CREATE TYPE apontamento_fonte_base AS ENUM ('PONTO', 'JORNADA', 'MANUAL');

-- 3. Enum para tipos de hora estendido (inclui ADM, DESLOCAMENTO, etc)
CREATE TYPE tipo_hora_ext AS ENUM ('NORMAL', 'EXTRA50', 'EXTRA100', 'DESLOCAMENTO', 'TREINAMENTO', 'ADM');

-- =============================================
-- Tabela: apontamento_dia (cabeçalho do dia)
-- =============================================
CREATE TABLE public.apontamento_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horas_base_dia NUMERIC(5,2) DEFAULT 8.00,
  total_horas_apontadas NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  status apontamento_dia_status NOT NULL DEFAULT 'RASCUNHO',
  fonte_base apontamento_fonte_base DEFAULT 'MANUAL',
  observacao TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  enviado_at TIMESTAMP WITH TIME ZONE,
  enviado_by UUID REFERENCES auth.users(id),
  aprovado_at TIMESTAMP WITH TIME ZONE,
  aprovado_by UUID REFERENCES auth.users(id),
  bloqueado_at TIMESTAMP WITH TIME ZONE,
  bloqueado_by UUID REFERENCES auth.users(id),
  
  UNIQUE(colaborador_id, data)
);

-- =============================================
-- Tabela: apontamento_item (linhas do dia)
-- =============================================
CREATE TABLE public.apontamento_item (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apontamento_dia_id UUID NOT NULL REFERENCES public.apontamento_dia(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id),
  atividade_id UUID, -- opcional, para futuras expansões
  tipo_hora tipo_hora_ext NOT NULL DEFAULT 'NORMAL',
  horas NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (horas >= 0),
  descricao TEXT,
  centro_custo_id UUID, -- preenchido automaticamente para projetos não-reais
  is_overhead BOOLEAN NOT NULL DEFAULT false, -- true para ADM, Orçamentos, etc
  
  -- Custo calculado
  custo_hora NUMERIC(12,4),
  custo_total NUMERIC(12,2),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- Índices para performance
-- =============================================
CREATE INDEX idx_apontamento_dia_colaborador ON apontamento_dia(colaborador_id);
CREATE INDEX idx_apontamento_dia_data ON apontamento_dia(data);
CREATE INDEX idx_apontamento_dia_status ON apontamento_dia(status);
CREATE INDEX idx_apontamento_item_dia ON apontamento_item(apontamento_dia_id);
CREATE INDEX idx_apontamento_item_projeto ON apontamento_item(projeto_id);

-- =============================================
-- Function: Recalcular total_horas_apontadas
-- =============================================
CREATE OR REPLACE FUNCTION recalculate_apontamento_dia_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update the parent apontamento_dia with new totals
  UPDATE apontamento_dia
  SET 
    total_horas_apontadas = COALESCE((
      SELECT SUM(horas) FROM apontamento_item 
      WHERE apontamento_dia_id = COALESCE(NEW.apontamento_dia_id, OLD.apontamento_dia_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.apontamento_dia_id, OLD.apontamento_dia_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para recalcular totais
CREATE TRIGGER trg_recalculate_apontamento_totals
AFTER INSERT OR UPDATE OR DELETE ON apontamento_item
FOR EACH ROW
EXECUTE FUNCTION recalculate_apontamento_dia_totals();

-- =============================================
-- Function: Calcular custo do item
-- =============================================
CREATE OR REPLACE FUNCTION calculate_apontamento_item_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_colaborador_id UUID;
  v_data DATE;
  v_custo_hora NUMERIC;
  v_fator NUMERIC := 1.0;
BEGIN
  -- Get colaborador_id and data from parent
  SELECT ad.colaborador_id, ad.data INTO v_colaborador_id, v_data
  FROM apontamento_dia ad
  WHERE ad.id = NEW.apontamento_dia_id;
  
  -- Get custo hora do colaborador
  SELECT custo_hora INTO v_custo_hora
  FROM get_custo_vigente(v_colaborador_id, v_data);
  
  -- Factor based on tipo_hora
  v_fator := CASE NEW.tipo_hora
    WHEN 'NORMAL' THEN 1.0
    WHEN 'EXTRA50' THEN 1.5
    WHEN 'EXTRA100' THEN 2.0
    WHEN 'DESLOCAMENTO' THEN 1.0
    WHEN 'TREINAMENTO' THEN 1.0
    WHEN 'ADM' THEN 1.0
    ELSE 1.0
  END;
  
  NEW.custo_hora := COALESCE(v_custo_hora, 0);
  NEW.custo_total := ROUND(NEW.horas * COALESCE(v_custo_hora, 0) * v_fator, 2);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_apontamento_item_cost
BEFORE INSERT OR UPDATE ON apontamento_item
FOR EACH ROW
EXECUTE FUNCTION calculate_apontamento_item_cost();

-- =============================================
-- View: Rateio diário por projeto
-- =============================================
CREATE OR REPLACE VIEW vw_rateio_dia_projeto AS
SELECT 
  ad.colaborador_id,
  ad.data,
  c.full_name as colaborador_nome,
  c.cpf,
  ai.projeto_id,
  p.nome as projeto_nome,
  p.os as projeto_os,
  p.status as projeto_status,
  ad.status as dia_status,
  SUM(ai.horas) as horas_projeto_dia,
  ad.total_horas_apontadas as horas_total_dia,
  CASE 
    WHEN ad.total_horas_apontadas > 0 
    THEN ROUND(SUM(ai.horas) / ad.total_horas_apontadas * 100, 2)
    ELSE 0 
  END as percentual,
  SUM(ai.custo_total) as custo_projeto_dia,
  ai.is_overhead
FROM apontamento_dia ad
JOIN apontamento_item ai ON ai.apontamento_dia_id = ad.id
JOIN collaborators c ON c.id = ad.colaborador_id
JOIN projetos p ON p.id = ai.projeto_id
GROUP BY 
  ad.colaborador_id, ad.data, c.full_name, c.cpf,
  ai.projeto_id, p.nome, p.os, p.status, ad.status, 
  ad.total_horas_apontadas, ai.is_overhead;

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE apontamento_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE apontamento_item ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all (for collaboration/approval)
CREATE POLICY "apontamento_dia_select" ON apontamento_dia
FOR SELECT TO authenticated USING (true);

CREATE POLICY "apontamento_item_select" ON apontamento_item
FOR SELECT TO authenticated USING (true);

-- Users can insert/update their own records or if they have admin role
CREATE POLICY "apontamento_dia_insert" ON apontamento_dia
FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "apontamento_dia_update" ON apontamento_dia
FOR UPDATE TO authenticated USING (
  -- Own records in RASCUNHO status
  (created_by = auth.uid() AND status = 'RASCUNHO')
  -- Admins can update ENVIADO
  OR (has_role(auth.uid(), 'admin') AND status IN ('RASCUNHO', 'ENVIADO'))
  -- Super admins can update anything except BLOQUEADO
  OR (has_role(auth.uid(), 'super_admin') AND status != 'BLOQUEADO')
);

CREATE POLICY "apontamento_item_insert" ON apontamento_item
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad 
    WHERE ad.id = apontamento_dia_id 
    AND (ad.created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
    AND ad.status = 'RASCUNHO'
  )
);

CREATE POLICY "apontamento_item_update" ON apontamento_item
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad 
    WHERE ad.id = apontamento_dia_id 
    AND (
      (ad.created_by = auth.uid() AND ad.status = 'RASCUNHO')
      OR (has_role(auth.uid(), 'admin') AND ad.status IN ('RASCUNHO', 'ENVIADO'))
      OR has_role(auth.uid(), 'super_admin')
    )
  )
);

CREATE POLICY "apontamento_item_delete" ON apontamento_item
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad 
    WHERE ad.id = apontamento_dia_id 
    AND (
      (ad.created_by = auth.uid() AND ad.status = 'RASCUNHO')
      OR (has_role(auth.uid(), 'admin') AND ad.status IN ('RASCUNHO', 'ENVIADO'))
      OR has_role(auth.uid(), 'super_admin')
    )
  )
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE apontamento_dia;
ALTER PUBLICATION supabase_realtime ADD TABLE apontamento_item;