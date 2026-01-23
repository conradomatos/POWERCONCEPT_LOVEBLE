-- =====================================================
-- REESTRUTURAÇÃO: Catálogos Globais + FKs nos Orçamentos
-- (Migração Completa - Corrigida)
-- =====================================================

-- 1. Adicionar FK catalog_id em labor_roles (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'labor_roles' 
                 AND column_name = 'catalog_id') THEN
    ALTER TABLE public.labor_roles ADD COLUMN catalog_id uuid REFERENCES public.labor_role_catalog(id);
  END IF;
END $$;

-- 2. Adicionar FK catalog_id em equipment_rentals (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'equipment_rentals' 
                 AND column_name = 'catalog_id') THEN
    ALTER TABLE public.equipment_rentals ADD COLUMN catalog_id uuid REFERENCES public.equipment_rentals_catalog(id);
  END IF;
END $$;

-- 3. Adicionar FK catalog_id em engineering_items (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'engineering_items' 
                 AND column_name = 'catalog_id') THEN
    ALTER TABLE public.engineering_items ADD COLUMN catalog_id uuid REFERENCES public.engineering_catalog(id);
  END IF;
END $$;

-- 4. Criar tabela budget_taxes para impostos por orçamento
CREATE TABLE IF NOT EXISTS public.budget_taxes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  tax_catalog_id uuid NOT NULL REFERENCES public.tax_rules_catalog(id),
  aliquota numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint para evitar duplicatas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_taxes_revision_tax_unique') THEN
    ALTER TABLE public.budget_taxes 
    ADD CONSTRAINT budget_taxes_revision_tax_unique UNIQUE (revision_id, tax_catalog_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.budget_taxes ENABLE ROW LEVEL SECURITY;

-- RLS policies para budget_taxes
DROP POLICY IF EXISTS "Usuários autenticados podem ver budget_taxes" ON public.budget_taxes;
CREATE POLICY "Usuários autenticados podem ver budget_taxes" 
ON public.budget_taxes 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admin e financeiro podem gerenciar budget_taxes" ON public.budget_taxes;
CREATE POLICY "Admin e financeiro podem gerenciar budget_taxes" 
ON public.budget_taxes 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- 5. Criar view para materiais com join no catálogo
CREATE OR REPLACE VIEW public.vw_budget_materials AS
SELECT 
  bmi.id,
  bmi.revision_id,
  bmi.wbs_id,
  bmi.item_seq,
  bmi.catalog_id,
  COALESCE(mc.codigo, bmi.codigo) as codigo,
  COALESCE(mc.descricao, bmi.descricao) as descricao,
  COALESCE(mc.unidade, bmi.unidade) as unidade,
  COALESCE(mc.hh_unit_ref, bmi.hh_unitario) as hh_unitario_ref,
  mc.categoria,
  mc.preco_ref as preco_referencia,
  bmi.quantidade,
  bmi.preco_unit,
  bmi.fator_dificuldade,
  bmi.fornecimento,
  bmi.observacao,
  bmi.quantidade * COALESCE(mc.hh_unit_ref, bmi.hh_unitario) * bmi.fator_dificuldade as hh_total,
  bmi.quantidade * bmi.preco_unit as preco_total,
  CASE WHEN bmi.catalog_id IS NOT NULL THEN true ELSE false END as from_catalog
FROM public.budget_material_items bmi
LEFT JOIN public.material_catalog mc ON bmi.catalog_id = mc.id;

-- 6. Criar view para labor_roles com join no catálogo
CREATE OR REPLACE VIEW public.vw_budget_labor_roles AS
SELECT 
  lr.id,
  lr.revision_id,
  lr.catalog_id,
  COALESCE(lrc.funcao, lr.funcao) as funcao,
  COALESCE(lrc.carga_horaria_ref, lr.carga_horaria_mensal) as carga_horaria_mensal,
  COALESCE(lrc.modalidade, lr.modalidade) as modalidade,
  lrc.salario_base_ref as salario_referencia,
  lr.salario_base,
  lr.ativo,
  CASE WHEN lr.catalog_id IS NOT NULL THEN true ELSE false END as from_catalog
FROM public.labor_roles lr
LEFT JOIN public.labor_role_catalog lrc ON lr.catalog_id = lrc.id;

-- 7. Criar view para equipment_rentals com join no catálogo
CREATE OR REPLACE VIEW public.vw_budget_equipment AS
SELECT 
  er.id,
  er.revision_id,
  er.catalog_id,
  COALESCE(erc.descricao, er.descricao) as descricao,
  erc.valor_mensal_ref as valor_referencia,
  er.quantidade,
  er.valor_mensal,
  er.meses,
  er.total,
  CASE WHEN er.catalog_id IS NOT NULL THEN true ELSE false END as from_catalog
FROM public.equipment_rentals er
LEFT JOIN public.equipment_rentals_catalog erc ON er.catalog_id = erc.id;

-- 8. Criar view para budget_taxes com join no catálogo
CREATE OR REPLACE VIEW public.vw_budget_taxes AS
SELECT 
  bt.id,
  bt.revision_id,
  bt.tax_catalog_id,
  trc.nome,
  trc.sigla,
  trc.tipo_valor,
  trc.base,
  trc.escopo,
  trc.valor as aliquota_referencia,
  bt.aliquota,
  bt.ativo,
  bt.created_at
FROM public.budget_taxes bt
JOIN public.tax_rules_catalog trc ON bt.tax_catalog_id = trc.id;

-- 9. Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_labor_roles_catalog_id ON public.labor_roles(catalog_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_catalog_id ON public.equipment_rentals(catalog_id);
CREATE INDEX IF NOT EXISTS idx_engineering_items_catalog_id ON public.engineering_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_budget_taxes_revision_id ON public.budget_taxes(revision_id);
CREATE INDEX IF NOT EXISTS idx_budget_taxes_catalog_id ON public.budget_taxes(tax_catalog_id);