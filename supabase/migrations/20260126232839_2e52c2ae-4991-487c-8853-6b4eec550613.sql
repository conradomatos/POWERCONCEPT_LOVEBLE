-- =============================================================
-- FASE 1: CORREÇÕES DE SEGURANÇA - MÓDULO ORÇAMENTOS
-- =============================================================

-- 1) CORRIGIR VIEWS SECURITY DEFINER → SECURITY INVOKER
-- As views vw_budget_materials, vw_budget_labor_roles, vw_budget_equipment, vw_budget_taxes
-- já foram corrigidas em migração anterior. Corrigir as restantes:

ALTER VIEW public.vw_budget_labor_roles_catalog SET (security_invoker = on);
ALTER VIEW public.vw_equipment_catalog SET (security_invoker = on);
ALTER VIEW public.vw_labor_incidence_by_role SET (security_invoker = on);
ALTER VIEW public.vw_labor_role_incidence_costs SET (security_invoker = on);
ALTER VIEW public.vw_custo_projeto SET (security_invoker = on);
ALTER VIEW public.vw_apontamentos_consolidado SET (security_invoker = on);
ALTER VIEW public.vw_rateio_dia_projeto SET (security_invoker = on);
ALTER VIEW public.vw_budget_labor_items SET (security_invoker = on);

-- 2) CORRIGIR FUNÇÕES SEM search_path
-- Recriar funções com SET search_path = 'public'

CREATE OR REPLACE FUNCTION public.update_equipment_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_equipment_price_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF OLD.preco_mensal_ref IS DISTINCT FROM NEW.preco_mensal_ref THEN
    INSERT INTO equipment_price_history (equipment_id, preco_anterior, preco_novo, changed_by)
    VALUES (NEW.id, OLD.preco_mensal_ref, NEW.preco_mensal_ref, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_budget_equipment_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_budget_labor_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_budget_labor_hh_custo(
  p_salario_base numeric, 
  p_beneficios_mensal numeric, 
  p_periculosidade_pct numeric, 
  p_insalubridade_pct numeric, 
  p_total_encargos_pct numeric, 
  p_carga_horaria_mensal numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
DECLARE
  v_salario_ajustado NUMERIC;
  v_custo_mensal_total NUMERIC;
  v_hh_custo NUMERIC;
BEGIN
  IF p_carga_horaria_mensal <= 0 THEN
    RETURN 0;
  END IF;
  
  v_salario_ajustado := p_salario_base * (1 + COALESCE(p_periculosidade_pct, 0) / 100 + COALESCE(p_insalubridade_pct, 0) / 100);
  v_custo_mensal_total := v_salario_ajustado * (1 + COALESCE(p_total_encargos_pct, 0) / 100) + COALESCE(p_beneficios_mensal, 0);
  v_hh_custo := v_custo_mensal_total / p_carga_horaria_mensal;
  
  RETURN ROUND(v_hh_custo, 4);
END;
$function$;

-- 3) AJUSTAR RLS POLICIES PERMISSIVAS - Tabelas de catálogos globais
-- Para catálogos globais (bases), mantemos SELECT público mas restringimos INSERT/UPDATE/DELETE para admins

-- Helper function: verificar se usuário tem role para gerenciar catálogos
CREATE OR REPLACE FUNCTION public.can_manage_catalogs(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_manage_catalogs.user_id
      AND role IN ('super_admin', 'admin', 'catalog_manager')
  )
$$;

-- 3.1) budget_labor_roles_catalog
DROP POLICY IF EXISTS "Authenticated users can delete budget_labor_roles_catalog" ON budget_labor_roles_catalog;
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_roles_catalog" ON budget_labor_roles_catalog;
DROP POLICY IF EXISTS "Authenticated users can update budget_labor_roles_catalog" ON budget_labor_roles_catalog;

CREATE POLICY "Admins can insert budget_labor_roles_catalog"
  ON budget_labor_roles_catalog FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update budget_labor_roles_catalog"
  ON budget_labor_roles_catalog FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_labor_roles_catalog"
  ON budget_labor_roles_catalog FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.2) budget_labor_charge_sets
DROP POLICY IF EXISTS "Authenticated users can delete budget_labor_charge_sets" ON budget_labor_charge_sets;
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_charge_sets" ON budget_labor_charge_sets;
DROP POLICY IF EXISTS "Authenticated users can update budget_labor_charge_sets" ON budget_labor_charge_sets;

CREATE POLICY "Admins can insert budget_labor_charge_sets"
  ON budget_labor_charge_sets FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update budget_labor_charge_sets"
  ON budget_labor_charge_sets FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_labor_charge_sets"
  ON budget_labor_charge_sets FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.3) budget_labor_groups
DROP POLICY IF EXISTS "Authenticated users can delete budget_labor_groups" ON budget_labor_groups;
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_groups" ON budget_labor_groups;
DROP POLICY IF EXISTS "Authenticated users can update budget_labor_groups" ON budget_labor_groups;

CREATE POLICY "Admins can insert budget_labor_groups"
  ON budget_labor_groups FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update budget_labor_groups"
  ON budget_labor_groups FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_labor_groups"
  ON budget_labor_groups FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.4) budget_labor_categories
DROP POLICY IF EXISTS "Authenticated users can delete budget_labor_categories" ON budget_labor_categories;
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_categories" ON budget_labor_categories;
DROP POLICY IF EXISTS "Authenticated users can update budget_labor_categories" ON budget_labor_categories;

CREATE POLICY "Admins can insert budget_labor_categories"
  ON budget_labor_categories FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update budget_labor_categories"
  ON budget_labor_categories FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_labor_categories"
  ON budget_labor_categories FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.5) budget_labor_tags
DROP POLICY IF EXISTS "Authenticated users can delete budget_labor_tags" ON budget_labor_tags;
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_tags" ON budget_labor_tags;
DROP POLICY IF EXISTS "Authenticated users can update budget_labor_tags" ON budget_labor_tags;

CREATE POLICY "Admins can insert budget_labor_tags"
  ON budget_labor_tags FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update budget_labor_tags"
  ON budget_labor_tags FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_labor_tags"
  ON budget_labor_tags FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.6) budget_fabricantes
DROP POLICY IF EXISTS "Authenticated users can delete fabricantes" ON budget_fabricantes;
DROP POLICY IF EXISTS "Authenticated users can insert fabricantes" ON budget_fabricantes;
DROP POLICY IF EXISTS "Authenticated users can update fabricantes" ON budget_fabricantes;

CREATE POLICY "Admins can insert budget_fabricantes"
  ON budget_fabricantes FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update budget_fabricantes"
  ON budget_fabricantes FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete budget_fabricantes"
  ON budget_fabricantes FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.7) equipment_catalog - restringe escrita para admins
DROP POLICY IF EXISTS "catalog_manager_delete" ON equipment_catalog;
DROP POLICY IF EXISTS "catalog_manager_insert" ON equipment_catalog;
DROP POLICY IF EXISTS "catalog_manager_update" ON equipment_catalog;

CREATE POLICY "Admins can insert equipment_catalog"
  ON equipment_catalog FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update equipment_catalog"
  ON equipment_catalog FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete equipment_catalog"
  ON equipment_catalog FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.8) material_catalog - restringe escrita para admins
DROP POLICY IF EXISTS "catalog_manager_delete" ON material_catalog;
DROP POLICY IF EXISTS "catalog_manager_insert" ON material_catalog;
DROP POLICY IF EXISTS "catalog_manager_update" ON material_catalog;
DROP POLICY IF EXISTS "Material catalog is writable by authenticated users" ON material_catalog;

CREATE POLICY "Admins can insert material_catalog"
  ON material_catalog FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update material_catalog"
  ON material_catalog FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete material_catalog"
  ON material_catalog FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.9) labor_incidence_items - restringe escrita para admins
DROP POLICY IF EXISTS "Authenticated users can delete labor_incidence_items" ON labor_incidence_items;
DROP POLICY IF EXISTS "Authenticated users can insert labor_incidence_items" ON labor_incidence_items;
DROP POLICY IF EXISTS "Authenticated users can update labor_incidence_items" ON labor_incidence_items;

CREATE POLICY "Admins can insert labor_incidence_items"
  ON labor_incidence_items FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update labor_incidence_items"
  ON labor_incidence_items FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete labor_incidence_items"
  ON labor_incidence_items FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.10) labor_incidence_groups - restringe escrita para admins
DROP POLICY IF EXISTS "Authenticated users can delete labor_incidence_groups" ON labor_incidence_groups;
DROP POLICY IF EXISTS "Authenticated users can insert labor_incidence_groups" ON labor_incidence_groups;
DROP POLICY IF EXISTS "Authenticated users can update labor_incidence_groups" ON labor_incidence_groups;

CREATE POLICY "Admins can insert labor_incidence_groups"
  ON labor_incidence_groups FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update labor_incidence_groups"
  ON labor_incidence_groups FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete labor_incidence_groups"
  ON labor_incidence_groups FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.11) tax_rules_catalog - restringe escrita para admins
DROP POLICY IF EXISTS "Authenticated users can delete tax_rules_catalog" ON tax_rules_catalog;
DROP POLICY IF EXISTS "Authenticated users can insert tax_rules_catalog" ON tax_rules_catalog;
DROP POLICY IF EXISTS "Authenticated users can update tax_rules_catalog" ON tax_rules_catalog;

CREATE POLICY "Admins can insert tax_rules_catalog"
  ON tax_rules_catalog FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update tax_rules_catalog"
  ON tax_rules_catalog FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete tax_rules_catalog"
  ON tax_rules_catalog FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

-- 3.12) wbs_templates e wbs_template_items - restringe escrita para admins
DROP POLICY IF EXISTS "Authenticated users can delete wbs_templates" ON wbs_templates;
DROP POLICY IF EXISTS "Authenticated users can insert wbs_templates" ON wbs_templates;
DROP POLICY IF EXISTS "Authenticated users can update wbs_templates" ON wbs_templates;

CREATE POLICY "Admins can insert wbs_templates"
  ON wbs_templates FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update wbs_templates"
  ON wbs_templates FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete wbs_templates"
  ON wbs_templates FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete wbs_template_items" ON wbs_template_items;
DROP POLICY IF EXISTS "Authenticated users can insert wbs_template_items" ON wbs_template_items;
DROP POLICY IF EXISTS "Authenticated users can update wbs_template_items" ON wbs_template_items;

CREATE POLICY "Admins can insert wbs_template_items"
  ON wbs_template_items FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can update wbs_template_items"
  ON wbs_template_items FOR UPDATE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));

CREATE POLICY "Admins can delete wbs_template_items"
  ON wbs_template_items FOR DELETE TO authenticated
  USING (public.can_manage_catalogs(auth.uid()));