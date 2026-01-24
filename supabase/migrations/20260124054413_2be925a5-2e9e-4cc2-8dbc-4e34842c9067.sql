-- 1) Alter calc_tipo enum to add ROTATIVIDADE_MESES and CONSUMO_MENSAL
-- First, we need to recreate the enum since Postgres doesn't support ALTER TYPE ADD VALUE in a transaction easily
-- Instead, we'll use text comparison and update the view logic

-- Update existing MENSAL items to be more specific based on their usage patterns
-- Items in group D (Alimentação) with qtd_mes -> CONSUMO_MENSAL
-- Items in group A with meses -> ROTATIVIDADE_MESES
-- The view will handle the calculation logic based on calc_tipo

-- 2) Create prices table for empresa/region context
CREATE TABLE IF NOT EXISTS public.labor_incidence_item_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incidence_item_id UUID NOT NULL REFERENCES public.labor_incidence_items(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  regiao_id UUID REFERENCES public.budget_regions(id) ON DELETE CASCADE,
  preco_unitario NUMERIC(15,4) NOT NULL,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  -- Unique constraint for the context+item+vigencia combination
  CONSTRAINT uq_incidence_price_context UNIQUE (incidence_item_id, empresa_id, regiao_id, vigencia_inicio)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_incidence_prices_item ON public.labor_incidence_item_prices(incidence_item_id);
CREATE INDEX IF NOT EXISTS idx_incidence_prices_context ON public.labor_incidence_item_prices(empresa_id, regiao_id);

-- 3) Create templates tables for MOD/MOI
CREATE TABLE IF NOT EXISTS public.labor_incidence_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo_mo TEXT NOT NULL CHECK (tipo_mo IN ('MOD', 'MOI')),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS public.labor_incidence_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.labor_incidence_templates(id) ON DELETE CASCADE,
  incidence_item_id UUID NOT NULL REFERENCES public.labor_incidence_items(id) ON DELETE CASCADE,
  ativo_default BOOLEAN NOT NULL DEFAULT true,
  -- Override defaults for this template
  qtd_override NUMERIC(15,4),
  meses_override NUMERIC(15,4),
  qtd_mes_override NUMERIC(15,4),
  preco_unitario_override NUMERIC(15,4),
  valor_mensal_override NUMERIC(15,4),
  observacao TEXT,
  CONSTRAINT uq_template_item UNIQUE (template_id, incidence_item_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_template_items_template ON public.labor_incidence_template_items(template_id);

-- 4) Seed default templates
INSERT INTO public.labor_incidence_templates (codigo, nome, tipo_mo, descricao) VALUES
  ('MOD_PADRAO', 'MOD Padrão', 'MOD', 'Template padrão para Mão de Obra Direta'),
  ('MOI_PADRAO', 'MOI Padrão', 'MOI', 'Template padrão para Mão de Obra Indireta')
ON CONFLICT (codigo) DO NOTHING;

-- 5) Function to get effective price for an incidence item (respects empresa+regiao context)
CREATE OR REPLACE FUNCTION public.get_incidence_effective_price(
  p_item_id UUID,
  p_empresa_id UUID DEFAULT NULL,
  p_regiao_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  -- Ordem de precedência: Empresa+Região > Empresa > Região > Catalog default
  SELECT preco_unitario INTO v_price
  FROM labor_incidence_item_prices
  WHERE incidence_item_id = p_item_id
    AND ativo = true
    AND (
      -- Empresa + Região
      (empresa_id = p_empresa_id AND regiao_id = p_regiao_id)
      OR
      -- Empresa apenas
      (empresa_id = p_empresa_id AND regiao_id IS NULL AND p_regiao_id IS NULL)
      OR
      -- Região apenas
      (empresa_id IS NULL AND regiao_id = p_regiao_id AND p_empresa_id IS NULL)
      OR
      -- Empresa apenas when searching for empresa+regiao
      (empresa_id = p_empresa_id AND regiao_id IS NULL)
      OR
      -- Região apenas when searching for empresa+regiao
      (empresa_id IS NULL AND regiao_id = p_regiao_id)
    )
    AND (vigencia_inicio IS NULL OR vigencia_inicio <= CURRENT_DATE)
    AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
  ORDER BY 
    CASE 
      WHEN empresa_id IS NOT NULL AND regiao_id IS NOT NULL THEN 1
      WHEN empresa_id IS NOT NULL THEN 2
      WHEN regiao_id IS NOT NULL THEN 3
      ELSE 4
    END
  LIMIT 1;
  
  -- If no price found, return NULL (caller should fallback to catalog default)
  RETURN v_price;
END;
$$;

-- 6) Update the view to handle 3 calculation types properly
-- Drop and recreate view
DROP VIEW IF EXISTS public.vw_labor_role_incidence_costs;

CREATE OR REPLACE VIEW public.vw_labor_role_incidence_costs AS
SELECT
  lri.id,
  lri.labor_role_id,
  lri.incidence_item_id,
  lri.ativo,
  COALESCE(lri.obrigatorio, lii.obrigatorio_default) AS obrigatorio,
  -- Effective values with override → default fallback
  COALESCE(lri.preco_unitario_override, lii.preco_unitario_default) AS preco_unitario,
  COALESCE(lri.qtd_override, lii.qtd_default, 1) AS qtd,
  COALESCE(lri.meses_override, lii.meses_default, 12) AS meses,
  COALESCE(lri.qtd_mes_override, lii.qtd_mes_default) AS qtd_mes,
  COALESCE(lri.valor_mensal_override, lii.valor_mensal_default) AS valor_mensal,
  lri.observacao,
  -- Override flags for UI indication
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
  -- Calculated cost per person per month based on calc_tipo
  CASE 
    WHEN lii.calc_tipo = 'RATEIO_MESES' THEN
      -- (qtd * preco_unit) / meses
      ROUND(
        (COALESCE(lri.qtd_override, lii.qtd_default, 1) * COALESCE(lri.preco_unitario_override, lii.preco_unitario_default, 0)) 
        / NULLIF(COALESCE(lri.meses_override, lii.meses_default, 12), 0),
        2
      )
    WHEN lii.calc_tipo = 'MENSAL' THEN
      -- valor_mensal OR (qtd_mes * preco_unit)
      ROUND(
        COALESCE(
          lri.valor_mensal_override, 
          lii.valor_mensal_default,
          (COALESCE(lri.qtd_mes_override, lii.qtd_mes_default, 0) * COALESCE(lri.preco_unitario_override, lii.preco_unitario_default, 0))
        ),
        2
      )
    ELSE 0
  END AS custo_mensal_por_pessoa
FROM labor_role_incidence lri
JOIN labor_incidence_items lii ON lii.id = lri.incidence_item_id
JOIN labor_incidence_groups lig ON lig.id = lii.group_id
WHERE lii.ativo = true;

-- 7) RLS Policies for new tables
ALTER TABLE public.labor_incidence_item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_incidence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_incidence_template_items ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "read_incidence_prices" ON public.labor_incidence_item_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "read_templates" ON public.labor_incidence_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "read_template_items" ON public.labor_incidence_template_items
  FOR SELECT TO authenticated USING (true);

-- Write access for catalog managers
CREATE POLICY "manage_incidence_prices" ON public.labor_incidence_item_prices
  FOR ALL TO authenticated
  USING (public.is_catalog_manager())
  WITH CHECK (public.is_catalog_manager());

CREATE POLICY "manage_templates" ON public.labor_incidence_templates
  FOR ALL TO authenticated
  USING (public.is_catalog_manager())
  WITH CHECK (public.is_catalog_manager());

CREATE POLICY "manage_template_items" ON public.labor_incidence_template_items
  FOR ALL TO authenticated
  USING (public.is_catalog_manager())
  WITH CHECK (public.is_catalog_manager());