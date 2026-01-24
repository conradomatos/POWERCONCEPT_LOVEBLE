-- =====================================================
-- LABOR INCIDENCES MODULE - EPIs/Incidências por Função
-- =====================================================

-- Enum for calculation type
CREATE TYPE labor_incidence_calc_tipo AS ENUM ('RATEIO_MESES', 'MENSAL');

-- =====================================================
-- 1. LABOR INCIDENCE GROUPS (A-E fixed groups)
-- =====================================================
CREATE TABLE public.labor_incidence_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert fixed groups A-E
INSERT INTO public.labor_incidence_groups (codigo, nome, ordem) VALUES
  ('A', 'Despesas Admissionais e Rescisórias', 1),
  ('B', 'Uniformes e Acessórios', 2),
  ('C', 'EPIs - Equipamentos de Proteção Individual', 3),
  ('D', 'Alimentação e Transporte', 4),
  ('E', 'Benefícios e Outros', 5);

-- Enable RLS
ALTER TABLE public.labor_incidence_groups ENABLE ROW LEVEL SECURITY;

-- Everyone can read groups
CREATE POLICY "Groups are viewable by authenticated users"
  ON public.labor_incidence_groups FOR SELECT
  TO authenticated USING (true);

-- =====================================================
-- 2. LABOR INCIDENCE ITEMS (Global Catalog)
-- =====================================================
CREATE TABLE public.labor_incidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.labor_incidence_groups(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  calc_tipo labor_incidence_calc_tipo NOT NULL DEFAULT 'RATEIO_MESES',
  -- Default parameters (nullable, depends on calc_tipo)
  preco_unitario_default NUMERIC(12,2),
  qtd_default NUMERIC(10,2),
  meses_default NUMERIC(6,2), -- rotatividade ou vida útil
  qtd_mes_default NUMERIC(10,2), -- for MENSAL (ex: dias de alimentação)
  valor_mensal_default NUMERIC(12,2), -- for MENSAL direct value
  obrigatorio_default BOOLEAN NOT NULL DEFAULT false,
  observacao_default TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Trigger for updated_at
CREATE TRIGGER update_labor_incidence_items_updated_at
  BEFORE UPDATE ON public.labor_incidence_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.labor_incidence_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read items
CREATE POLICY "Items are viewable by authenticated users"
  ON public.labor_incidence_items FOR SELECT
  TO authenticated USING (true);

-- Only catalog_manager can modify
CREATE POLICY "Catalog managers can insert items"
  ON public.labor_incidence_items FOR INSERT
  TO authenticated WITH CHECK (public.is_catalog_manager());

CREATE POLICY "Catalog managers can update items"
  ON public.labor_incidence_items FOR UPDATE
  TO authenticated USING (public.is_catalog_manager());

CREATE POLICY "Catalog managers can delete items"
  ON public.labor_incidence_items FOR DELETE
  TO authenticated USING (public.is_catalog_manager());

-- =====================================================
-- 3. LABOR ROLE INCIDENCE (Config per Function)
-- =====================================================
CREATE TABLE public.labor_role_incidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_role_id UUID NOT NULL REFERENCES public.budget_labor_roles_catalog(id) ON DELETE CASCADE,
  incidence_item_id UUID NOT NULL REFERENCES public.labor_incidence_items(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  obrigatorio BOOLEAN, -- null = use default
  -- Overrides (null = use catalog default)
  preco_unitario_override NUMERIC(12,2),
  qtd_override NUMERIC(10,2),
  meses_override NUMERIC(6,2),
  qtd_mes_override NUMERIC(10,2),
  valor_mensal_override NUMERIC(12,2),
  observacao TEXT,
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  -- Unique constraint
  UNIQUE (labor_role_id, incidence_item_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_labor_role_incidence_updated_at
  BEFORE UPDATE ON public.labor_role_incidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.labor_role_incidence ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Role incidences are viewable by authenticated users"
  ON public.labor_role_incidence FOR SELECT
  TO authenticated USING (true);

-- Admin roles can modify
CREATE POLICY "Admins can insert role incidences"
  ON public.labor_role_incidence FOR INSERT
  TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'rh')
  );

CREATE POLICY "Admins can update role incidences"
  ON public.labor_role_incidence FOR UPDATE
  TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'rh')
  );

CREATE POLICY "Admins can delete role incidences"
  ON public.labor_role_incidence FOR DELETE
  TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'rh')
  );

-- =====================================================
-- 4. VIEW: Effective costs per role/item
-- =====================================================
CREATE OR REPLACE VIEW public.vw_labor_role_incidence_costs AS
SELECT
  lri.id,
  lri.labor_role_id,
  lri.incidence_item_id,
  lri.ativo,
  -- Effective parameters (override -> default)
  COALESCE(lri.obrigatorio, lii.obrigatorio_default) AS obrigatorio,
  COALESCE(lri.preco_unitario_override, lii.preco_unitario_default) AS preco_unitario,
  COALESCE(lri.qtd_override, lii.qtd_default, 1) AS qtd,
  COALESCE(lri.meses_override, lii.meses_default) AS meses,
  COALESCE(lri.qtd_mes_override, lii.qtd_mes_default) AS qtd_mes,
  COALESCE(lri.valor_mensal_override, lii.valor_mensal_default) AS valor_mensal,
  COALESCE(lri.observacao, lii.observacao_default) AS observacao,
  -- Override flags
  lri.preco_unitario_override IS NOT NULL AS has_preco_override,
  lri.qtd_override IS NOT NULL AS has_qtd_override,
  lri.meses_override IS NOT NULL AS has_meses_override,
  lri.qtd_mes_override IS NOT NULL AS has_qtd_mes_override,
  lri.valor_mensal_override IS NOT NULL AS has_valor_mensal_override,
  -- Item info
  lii.codigo AS item_codigo,
  lii.descricao AS item_descricao,
  lii.calc_tipo,
  -- Group info
  lig.id AS group_id,
  lig.codigo AS group_codigo,
  lig.nome AS group_nome,
  lig.ordem AS group_ordem,
  -- Calculated cost per month per person
  CASE 
    WHEN lii.calc_tipo = 'RATEIO_MESES' THEN
      ROUND(
        (COALESCE(lri.qtd_override, lii.qtd_default, 1) * 
         COALESCE(lri.preco_unitario_override, lii.preco_unitario_default, 0)) /
        NULLIF(COALESCE(lri.meses_override, lii.meses_default, 1), 0),
        2
      )
    WHEN lii.calc_tipo = 'MENSAL' THEN
      CASE 
        WHEN COALESCE(lri.valor_mensal_override, lii.valor_mensal_default) IS NOT NULL THEN
          COALESCE(lri.valor_mensal_override, lii.valor_mensal_default)
        ELSE
          ROUND(
            COALESCE(lri.qtd_mes_override, lii.qtd_mes_default, 0) * 
            COALESCE(lri.preco_unitario_override, lii.preco_unitario_default, 0),
            2
          )
      END
    ELSE 0
  END AS custo_mensal_por_pessoa,
  -- Timestamps
  lri.created_at,
  lri.updated_at
FROM public.labor_role_incidence lri
JOIN public.labor_incidence_items lii ON lii.id = lri.incidence_item_id
JOIN public.labor_incidence_groups lig ON lig.id = lii.group_id
WHERE lii.ativo = true;

-- =====================================================
-- 5. FUNCTION: Get total incidences for a role
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_labor_role_incidence_totals(p_labor_role_id UUID)
RETURNS TABLE (
  group_codigo TEXT,
  group_nome TEXT,
  total_grupo NUMERIC,
  total_geral NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_total_geral NUMERIC;
BEGIN
  -- Calculate total geral first
  SELECT COALESCE(SUM(custo_mensal_por_pessoa), 0) INTO v_total_geral
  FROM vw_labor_role_incidence_costs
  WHERE labor_role_id = p_labor_role_id AND ativo = true;

  -- Return group totals with overall total
  RETURN QUERY
  SELECT 
    lig.codigo AS group_codigo,
    lig.nome AS group_nome,
    COALESCE(SUM(vw.custo_mensal_por_pessoa), 0) AS total_grupo,
    v_total_geral AS total_geral
  FROM labor_incidence_groups lig
  LEFT JOIN vw_labor_role_incidence_costs vw ON vw.group_codigo = lig.codigo 
    AND vw.labor_role_id = p_labor_role_id 
    AND vw.ativo = true
  GROUP BY lig.codigo, lig.nome, lig.ordem
  ORDER BY lig.ordem;
END;
$$;

-- =====================================================
-- 6. SEED: Example incidence items (optional)
-- =====================================================
INSERT INTO public.labor_incidence_items (group_id, codigo, descricao, calc_tipo, preco_unitario_default, qtd_default, meses_default, qtd_mes_default, valor_mensal_default, obrigatorio_default) VALUES
-- Group A - Despesas Admissionais
((SELECT id FROM labor_incidence_groups WHERE codigo = 'A'), 'A1', 'Exame Admissional', 'RATEIO_MESES', 150.00, 1, 12, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'A'), 'A2', 'Exame Demissional', 'RATEIO_MESES', 150.00, 1, 12, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'A'), 'A3', 'Integração/Treinamento', 'RATEIO_MESES', 200.00, 1, 12, NULL, NULL, false),
-- Group B - Uniformes
((SELECT id FROM labor_incidence_groups WHERE codigo = 'B'), 'B1', 'Camisa Manga Longa', 'RATEIO_MESES', 45.00, 2, 6, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'B'), 'B2', 'Calça de Brim', 'RATEIO_MESES', 65.00, 2, 6, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'B'), 'B3', 'Botina de Segurança', 'RATEIO_MESES', 120.00, 1, 6, NULL, NULL, true),
-- Group C - EPIs
((SELECT id FROM labor_incidence_groups WHERE codigo = 'C'), 'C1', 'Capacete', 'RATEIO_MESES', 45.00, 1, 24, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'C'), 'C2', 'Óculos de Proteção', 'RATEIO_MESES', 15.00, 1, 6, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'C'), 'C3', 'Protetor Auricular', 'RATEIO_MESES', 8.00, 2, 3, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'C'), 'C4', 'Luva de Segurança', 'RATEIO_MESES', 25.00, 2, 2, NULL, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'C'), 'C5', 'Cinto de Segurança (NR35)', 'RATEIO_MESES', 350.00, 1, 24, NULL, NULL, false),
-- Group D - Alimentação
((SELECT id FROM labor_incidence_groups WHERE codigo = 'D'), 'D1', 'Vale Refeição', 'MENSAL', 35.00, NULL, NULL, 22, NULL, true),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'D'), 'D2', 'Vale Alimentação', 'MENSAL', NULL, NULL, NULL, NULL, 300.00, false),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'D'), 'D3', 'Vale Transporte', 'MENSAL', 9.50, NULL, NULL, 44, NULL, true),
-- Group E - Benefícios
((SELECT id FROM labor_incidence_groups WHERE codigo = 'E'), 'E1', 'Plano de Saúde', 'MENSAL', NULL, NULL, NULL, NULL, 450.00, false),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'E'), 'E2', 'Plano Odontológico', 'MENSAL', NULL, NULL, NULL, NULL, 35.00, false),
((SELECT id FROM labor_incidence_groups WHERE codigo = 'E'), 'E3', 'Seguro de Vida', 'MENSAL', NULL, NULL, NULL, NULL, 25.00, true);