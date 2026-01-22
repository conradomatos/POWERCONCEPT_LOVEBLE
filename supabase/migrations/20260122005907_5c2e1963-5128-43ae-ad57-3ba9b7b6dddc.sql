-- Fix security definer view by setting security_invoker = true
ALTER VIEW public.vw_rentabilidade_projeto SET (security_invoker = true);