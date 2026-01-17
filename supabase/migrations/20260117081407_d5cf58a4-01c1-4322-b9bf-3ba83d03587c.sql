-- Rename table from projéteis to projetos
ALTER TABLE IF EXISTS public."projéteis" RENAME TO projetos;

-- Update the protect_sistema_projects function to reference the correct table name
CREATE OR REPLACE FUNCTION public.protect_sistema_projects()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_sistema = true THEN
      RAISE EXCEPTION 'Não é possível excluir projetos do sistema';
    END IF;
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_sistema = true THEN
      -- Prevent changing system flag or OS on system projects
      IF NEW.is_sistema != OLD.is_sistema OR NEW.os != OLD.os THEN
        RAISE EXCEPTION 'Não é possível alterar projetos do sistema';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and recreate on the renamed table
DROP TRIGGER IF EXISTS protect_sistema_projects_trigger ON public.projetos;
CREATE TRIGGER protect_sistema_projects_trigger
  BEFORE UPDATE OR DELETE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sistema_projects();

-- Drop existing trigger for OS protection and recreate
DROP TRIGGER IF EXISTS protect_projeto_os_trigger ON public.projetos;
CREATE TRIGGER protect_projeto_os_trigger
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_projeto_os();