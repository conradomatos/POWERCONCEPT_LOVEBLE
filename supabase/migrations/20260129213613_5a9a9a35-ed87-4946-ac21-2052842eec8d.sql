-- ============================================================
-- Fix overly permissive RLS policies on budget_equipment_items and budget_labor_items
-- And add permission checks to SECURITY DEFINER functions
-- ============================================================

-- ======================
-- 1. FIX budget_equipment_items RLS POLICIES
-- ======================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "budget_equipment_items_delete" ON budget_equipment_items;
DROP POLICY IF EXISTS "budget_equipment_items_insert" ON budget_equipment_items;
DROP POLICY IF EXISTS "budget_equipment_items_update" ON budget_equipment_items;
-- Keep select policy as-is (read access is fine for authenticated users)

-- Create role-based policies
CREATE POLICY "Admin/Financeiro can insert equipment items"
  ON budget_equipment_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) 
              OR has_role(auth.uid(), 'financeiro'::app_role)
              OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin/Financeiro can update equipment items"
  ON budget_equipment_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) 
         OR has_role(auth.uid(), 'financeiro'::app_role)
         OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin/Financeiro can delete equipment items"
  ON budget_equipment_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) 
         OR has_role(auth.uid(), 'financeiro'::app_role)
         OR has_role(auth.uid(), 'super_admin'::app_role));

-- ======================
-- 2. FIX budget_labor_items RLS POLICIES
-- ======================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete budget_labor_items" ON budget_labor_items;
DROP POLICY IF EXISTS "Authenticated users can insert budget_labor_items" ON budget_labor_items;
DROP POLICY IF EXISTS "Authenticated users can update budget_labor_items" ON budget_labor_items;
-- Keep select policy as-is (read access is fine for authenticated users)

-- Create role-based policies
CREATE POLICY "Admin/Financeiro can insert labor items"
  ON budget_labor_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) 
              OR has_role(auth.uid(), 'financeiro'::app_role)
              OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin/Financeiro can update labor items"
  ON budget_labor_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) 
         OR has_role(auth.uid(), 'financeiro'::app_role)
         OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin/Financeiro can delete labor items"
  ON budget_labor_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) 
         OR has_role(auth.uid(), 'financeiro'::app_role)
         OR has_role(auth.uid(), 'super_admin'::app_role));

-- ======================
-- 3. REVOKE PUBLIC ACCESS to SECURITY DEFINER functions
-- These functions are not called from client code but could be exploited via RPC
-- ======================

-- Revoke execute on get_custo_vigente (returns sensitive salary data)
REVOKE EXECUTE ON FUNCTION public.get_custo_vigente(uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_custo_vigente(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_custo_vigente(uuid, date) FROM authenticated;

-- Revoke execute on get_alocacao_por_data (returns allocation data)
REVOKE EXECUTE ON FUNCTION public.get_alocacao_por_data(uuid, date, alocacao_tipo) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_alocacao_por_data(uuid, date, alocacao_tipo) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_alocacao_por_data(uuid, date, alocacao_tipo) FROM authenticated;