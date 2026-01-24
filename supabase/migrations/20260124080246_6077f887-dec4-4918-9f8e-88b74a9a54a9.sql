
-- 1) Criar tabela de regras por função
CREATE TABLE public.labor_incidence_role_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.budget_labor_roles_catalog(id) ON DELETE CASCADE,
  incidence_item_id UUID NOT NULL REFERENCES public.labor_incidence_items(id) ON DELETE CASCADE,
  is_applicable BOOLEAN DEFAULT NULL,
  is_mandatory BOOLEAN DEFAULT NULL,
  override_qty NUMERIC DEFAULT NULL,
  override_unit_price NUMERIC DEFAULT NULL,
  override_months_factor NUMERIC DEFAULT NULL,
  override_notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(role_id, incidence_item_id)
);

-- Enable RLS
ALTER TABLE public.labor_incidence_role_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view labor incidence role rules"
  ON public.labor_incidence_role_rules FOR SELECT
  USING (true);

CREATE POLICY "Catalog managers can manage labor incidence role rules"
  ON public.labor_incidence_role_rules FOR ALL
  USING (is_catalog_manager());

-- Trigger for updated_at
CREATE TRIGGER update_labor_incidence_role_rules_updated_at
  BEFORE UPDATE ON public.labor_incidence_role_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2) Criar view para incidências por função
CREATE OR REPLACE VIEW public.vw_labor_incidence_by_role AS
SELECT
  lii.id AS item_id,
  lii.codigo AS item_codigo,
  lii.descricao AS item_descricao,
  lii.calc_tipo,
  lig.id AS group_id,
  lig.codigo AS group_codigo,
  lig.nome AS group_nome,
  lig.ordem AS group_ordem,
  blrc.id AS role_id,
  blrc.codigo AS role_codigo,
  blrc.nome AS role_nome,
  lirr.id AS rule_id,
  -- Final values with coalesce
  COALESCE(lirr.override_qty, lii.qtd_default) AS qty_final,
  COALESCE(lirr.override_unit_price, lii.preco_unitario_default) AS unit_price_final,
  COALESCE(lirr.override_months_factor, lii.meses_default) AS months_factor_final,
  COALESCE(lirr.override_qty, lii.qtd_mes_default) AS qtd_mes_final,
  COALESCE(lirr.is_applicable, 
    CASE 
      WHEN lii.valor_mensal_default IS NOT NULL OR 
           (lii.preco_unitario_default IS NOT NULL AND lii.qtd_default IS NOT NULL) 
      THEN true 
      ELSE false 
    END
  ) AS is_applicable_final,
  COALESCE(lirr.is_mandatory, lii.obrigatorio_default) AS is_mandatory_final,
  lirr.override_notes,
  -- Raw override values for UI
  lirr.is_applicable AS override_is_applicable,
  lirr.is_mandatory AS override_is_mandatory,
  lirr.override_qty,
  lirr.override_unit_price,
  lirr.override_months_factor,
  -- Item defaults for reference
  lii.valor_mensal_default,
  lii.preco_unitario_default,
  lii.qtd_default,
  lii.meses_default,
  lii.qtd_mes_default,
  -- Calculate custo_mensal based on calc_tipo
  CASE 
    WHEN COALESCE(lirr.is_applicable, 
           CASE 
             WHEN lii.valor_mensal_default IS NOT NULL OR 
                  (lii.preco_unitario_default IS NOT NULL AND lii.qtd_default IS NOT NULL) 
             THEN true 
             ELSE false 
           END) = false 
    THEN 0
    WHEN lii.calc_tipo = 'MENSAL' THEN 
      COALESCE(lirr.override_qty, lii.qtd_mes_default, lii.qtd_default, 0) * 
      COALESCE(lirr.override_unit_price, lii.preco_unitario_default, 0)
    WHEN lii.calc_tipo = 'RATEIO_MESES' THEN 
      ROUND(
        COALESCE(lirr.override_qty, lii.qtd_default, 0) * 
        COALESCE(lirr.override_unit_price, lii.preco_unitario_default, 0) / 
        NULLIF(COALESCE(lirr.override_months_factor, lii.meses_default, 12), 0),
        2
      )
    ELSE 0
  END AS custo_mensal_pessoa_final
FROM public.labor_incidence_items lii
JOIN public.labor_incidence_groups lig ON lig.id = lii.group_id
CROSS JOIN public.budget_labor_roles_catalog blrc
LEFT JOIN public.labor_incidence_role_rules lirr 
  ON lirr.incidence_item_id = lii.id AND lirr.role_id = blrc.id
WHERE lii.ativo = true AND blrc.ativo = true;
