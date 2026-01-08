-- Fix: Restrict custos_colaborador SELECT access to admin and RH roles only
-- This protects sensitive salary/benefit data from unauthorized disclosure

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users with roles can view custos" ON public.custos_colaborador;

-- Create a more restrictive policy for SELECT
CREATE POLICY "RH and Admin can view custos"
  ON public.custos_colaborador FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));