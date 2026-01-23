-- Create is_super_admin helper function if not exists
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Drop old delete policy
DROP POLICY IF EXISTS "Admin can delete alocacoes_blocos" ON public.alocacoes_blocos;

-- New policy: RH and Admin can delete PLANNED blocks
CREATE POLICY "RH and Admin can delete planned alocacoes_blocos"
ON public.alocacoes_blocos FOR DELETE
USING (
  tipo = 'planejado' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role)
  )
);

-- New policy: Only Super Admin can delete REALIZED blocks
CREATE POLICY "Super Admin can delete realized alocacoes_blocos"
ON public.alocacoes_blocos FOR DELETE
USING (
  tipo = 'realizado' AND is_super_admin(auth.uid())
);