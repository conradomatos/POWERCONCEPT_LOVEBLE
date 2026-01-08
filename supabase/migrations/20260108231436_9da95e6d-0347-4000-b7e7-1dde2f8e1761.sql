-- Create function to check if user is super_admin (using text comparison to avoid enum issues)
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
      AND role::text = 'super_admin'
  )
$$;

-- Create trigger function to prevent OS changes by non-super_admin
CREATE OR REPLACE FUNCTION public.protect_projeto_os()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check on UPDATE when OS is being changed
  IF TG_OP = 'UPDATE' AND OLD.os IS DISTINCT FROM NEW.os THEN
    -- Check if user is super_admin
    IF NOT is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Sem permissão para alterar OS. Somente Admin Master pode alterar.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on projetos table
DROP TRIGGER IF EXISTS protect_projeto_os_trigger ON public.projetos;
CREATE TRIGGER protect_projeto_os_trigger
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_projeto_os();