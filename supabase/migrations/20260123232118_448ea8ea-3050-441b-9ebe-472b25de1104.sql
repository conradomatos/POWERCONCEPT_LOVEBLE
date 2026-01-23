-- Corrigir Security Definer Views - definir como SECURITY INVOKER
-- Isso garante que as views respeitam as permissões do usuário que consulta

ALTER VIEW public.vw_budget_materials SET (security_invoker = on);
ALTER VIEW public.vw_budget_labor_roles SET (security_invoker = on);
ALTER VIEW public.vw_budget_equipment SET (security_invoker = on);
ALTER VIEW public.vw_budget_taxes SET (security_invoker = on);