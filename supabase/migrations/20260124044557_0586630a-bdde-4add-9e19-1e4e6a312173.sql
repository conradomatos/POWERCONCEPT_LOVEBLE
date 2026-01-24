-- =====================================================
-- MIGRAÇÃO: Adicionar valor_ref_hh ao Catálogo de MO
-- e criar tabela budget_labor_items com snapshot/override
-- =====================================================

-- 1) Adicionar valor_ref_hh ao catálogo global (opcional, valor de referência por hora)
ALTER TABLE public.budget_labor_roles_catalog
ADD COLUMN IF NOT EXISTS valor_ref_hh NUMERIC(12,4) DEFAULT NULL;

COMMENT ON COLUMN public.budget_labor_roles_catalog.valor_ref_hh IS 
  'Valor de referência por hora (R$/h) - padrão sugerido, opcional';

-- 2) Atualizar a view para incluir valor_ref_hh
DROP VIEW IF EXISTS public.vw_budget_labor_roles_catalog;

CREATE VIEW public.vw_budget_labor_roles_catalog AS
SELECT 
  r.id,
  r.codigo,
  r.nome,
  r.tipo_mo,
  r.regime,
  r.carga_horaria_mensal,
  r.salario_base,
  r.beneficios_mensal,
  r.periculosidade_pct,
  r.insalubridade_pct,
  r.charge_set_id,
  r.hh_custo,
  r.valor_ref_hh,
  r.produtividade_valor,
  r.produtividade_tipo,
  r.produtividade_unidade,
  r.group_id,
  r.category_id,
  r.observacao,
  r.ativo,
  r.created_at,
  r.updated_at,
  g.nome AS group_nome,
  c.nome AS category_nome,
  cs.nome AS charge_set_nome,
  cs.total_encargos_pct
FROM public.budget_labor_roles_catalog r
LEFT JOIN public.budget_labor_groups g ON r.group_id = g.id
LEFT JOIN public.budget_labor_categories c ON r.category_id = c.id
LEFT JOIN public.budget_labor_charge_sets cs ON r.charge_set_id = cs.id;

-- 3) Criar tabela budget_labor_items para itens de MO por orçamento/revisão
CREATE TABLE IF NOT EXISTS public.budget_labor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES public.budget_labor_roles_catalog(id) ON DELETE SET NULL,
  
  -- Snapshots do catálogo no momento da inclusão
  codigo_snapshot TEXT NOT NULL,
  nome_snapshot TEXT NOT NULL,
  tipo_mo_snapshot public.budget_labor_type NOT NULL DEFAULT 'MOD',
  regime_snapshot public.budget_labor_regime NOT NULL DEFAULT 'CLT',
  carga_horaria_snapshot NUMERIC(8,2) NOT NULL DEFAULT 220,
  valor_ref_hh_snapshot NUMERIC(12,4),
  
  -- Override editável pelo usuário (nullable = usa ref)
  valor_hh_override NUMERIC(12,4),
  
  -- Quantidade de horas no orçamento
  qtd_hh NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Total calculado (GENERATED ou via trigger)
  -- total = qtd_hh * COALESCE(valor_hh_override, valor_ref_hh_snapshot, 0)
  total NUMERIC(15,2) GENERATED ALWAYS AS (
    qtd_hh * COALESCE(valor_hh_override, valor_ref_hh_snapshot, 0)
  ) STORED,
  
  observacao TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: cada função só pode aparecer uma vez por revisão
  UNIQUE(revision_id, codigo_snapshot)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_budget_labor_items_revision ON public.budget_labor_items(revision_id);
CREATE INDEX IF NOT EXISTS idx_budget_labor_items_catalog ON public.budget_labor_items(catalog_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_budget_labor_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_budget_labor_items_updated_at ON public.budget_labor_items;
CREATE TRIGGER trigger_update_budget_labor_items_updated_at
  BEFORE UPDATE ON public.budget_labor_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_labor_items_updated_at();

-- 4) RLS Policies para budget_labor_items
ALTER TABLE public.budget_labor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read budget_labor_items"
  ON public.budget_labor_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert budget_labor_items"
  ON public.budget_labor_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update budget_labor_items"
  ON public.budget_labor_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete budget_labor_items"
  ON public.budget_labor_items FOR DELETE TO authenticated USING (true);

-- 5) View para facilitar consultas com valor efetivo
CREATE OR REPLACE VIEW public.vw_budget_labor_items AS
SELECT 
  bli.id,
  bli.revision_id,
  bli.catalog_id,
  bli.codigo_snapshot,
  bli.nome_snapshot,
  bli.tipo_mo_snapshot,
  bli.regime_snapshot,
  bli.carga_horaria_snapshot,
  bli.valor_ref_hh_snapshot,
  bli.valor_hh_override,
  COALESCE(bli.valor_hh_override, bli.valor_ref_hh_snapshot, 0) AS valor_hh_efetivo,
  bli.qtd_hh,
  bli.total,
  bli.observacao,
  bli.created_at,
  bli.updated_at,
  -- Flag para indicar se está usando override
  CASE 
    WHEN bli.valor_hh_override IS NOT NULL 
      AND bli.valor_hh_override IS DISTINCT FROM bli.valor_ref_hh_snapshot 
    THEN true 
    ELSE false 
  END AS has_override,
  -- Dados atuais do catálogo (se ainda existir)
  blrc.valor_ref_hh AS catalog_valor_ref_hh_atual,
  blrc.nome AS catalog_nome_atual
FROM public.budget_labor_items bli
LEFT JOIN public.budget_labor_roles_catalog blrc ON bli.catalog_id = blrc.id;

-- 6) Adicionar alias valor_ref_hh à importação (opcional, via código)