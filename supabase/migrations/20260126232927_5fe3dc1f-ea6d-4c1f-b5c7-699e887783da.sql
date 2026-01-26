-- =============================================================
-- FASE 1.2: CORREÇÕES DE SEGURANÇA - MAIS POLICIES PERMISSIVAS
-- =============================================================

-- 1) Corrigir view restante - vw_rentabilidade_projeto (única SECURITY DEFINER ainda)
-- Já possui security_invoker = true na criação original, verificar se está correto
ALTER VIEW public.vw_rentabilidade_projeto SET (security_invoker = on);

-- 2) budget_equipment_items - manter permissivo pois é dado de revisão específica
-- Usuários autenticados podem gerenciar itens dentro de revisões que têm acesso
-- (O lock por status já é feito via useRevisionLock no frontend)

-- 3) budget_labor_catalog_tags - restringir para admins (catálogo global)
DROP POLICY IF EXISTS "Authenticated users can delete budget_labor_catalog_tags" ON budget_labor_catalog_tags;
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_catalog_tags" ON budget_labor_catalog_tags;

CREATE POLICY "Admins can insert budget_labor_catalog_tags"
  ON budget_labor_catalog_tags FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_labor_catalog_tags"
  ON budget_labor_catalog_tags FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 4) budget_labor_import_runs - restringir para admins
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_import_runs" ON budget_labor_import_runs;

CREATE POLICY "Admins can insert budget_labor_import_runs"
  ON budget_labor_import_runs FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

-- 5) budget_labor_roles_history - este é log, só admins devem inserir via trigger
-- Mantemos para auditoria mas restringimos insert manual
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_roles_history" ON budget_labor_roles_history;

CREATE POLICY "System or admins can insert budget_labor_roles_history"
  ON budget_labor_roles_history FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

-- 6) budget_regions - restringir para admins (dado de referência global)
DROP POLICY IF EXISTS "Authenticated users can delete regions" ON budget_regions;
DROP POLICY IF EXISTS "Authenticated users can insert regions" ON budget_regions;
DROP POLICY IF EXISTS "Authenticated users can update regions" ON budget_regions;

CREATE POLICY "Admins can insert budget_regions"
  ON budget_regions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update budget_regions"
  ON budget_regions FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_regions"
  ON budget_regions FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 7) pricebooks, material_pricebook_items, mo_pricebook_items - restringir para admins
DROP POLICY IF EXISTS "Authenticated users can delete pricebooks" ON pricebooks;
DROP POLICY IF EXISTS "Authenticated users can insert pricebooks" ON pricebooks;
DROP POLICY IF EXISTS "Authenticated users can update pricebooks" ON pricebooks;

CREATE POLICY "Admins can insert pricebooks"
  ON pricebooks FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update pricebooks"
  ON pricebooks FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete pricebooks"
  ON pricebooks FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete material prices" ON material_pricebook_items;
DROP POLICY IF EXISTS "Authenticated users can insert material prices" ON material_pricebook_items;
DROP POLICY IF EXISTS "Authenticated users can update material prices" ON material_pricebook_items;

CREATE POLICY "Admins can insert material_pricebook_items"
  ON material_pricebook_items FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update material_pricebook_items"
  ON material_pricebook_items FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete material_pricebook_items"
  ON material_pricebook_items FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete mo prices" ON mo_pricebook_items;
DROP POLICY IF EXISTS "Authenticated users can insert mo prices" ON mo_pricebook_items;
DROP POLICY IF EXISTS "Authenticated users can update mo prices" ON mo_pricebook_items;

CREATE POLICY "Admins can insert mo_pricebook_items"
  ON mo_pricebook_items FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update mo_pricebook_items"
  ON mo_pricebook_items FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete mo_pricebook_items"
  ON mo_pricebook_items FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));