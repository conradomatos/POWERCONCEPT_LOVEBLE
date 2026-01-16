-- Fix: Restrict collaborators table access to only HR and Admin roles
-- The collaborators table contains sensitive PII (CPF, phone, email, birth dates)
-- and should not be accessible to all authenticated users

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users with roles can view collaborators" ON public.collaborators;

-- Create a more restrictive policy that only allows HR and Admin to view collaborators
CREATE POLICY "RH and Admin can view collaborators" 
ON public.collaborators 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));