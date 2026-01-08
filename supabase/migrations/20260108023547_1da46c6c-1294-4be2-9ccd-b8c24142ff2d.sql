-- Add OS (Ordem de Serviço) field to projetos table
ALTER TABLE public.projetos 
ADD COLUMN IF NOT EXISTS os TEXT;

-- Populate OS with sequential numbers for existing records (based on creation order)
WITH numbered_projects AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.projetos
  WHERE os IS NULL
)
UPDATE public.projetos p
SET os = LPAD(np.row_num::TEXT, 4, '0')
FROM numbered_projects np
WHERE p.id = np.id;

-- Make OS required and unique after populating
ALTER TABLE public.projetos 
ALTER COLUMN os SET NOT NULL;

-- Create unique index for OS
CREATE UNIQUE INDEX IF NOT EXISTS projetos_os_unique ON public.projetos(os);

-- Create function to auto-generate next OS number
CREATE OR REPLACE FUNCTION public.generate_next_os()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(os AS INTEGER)), 0) + 1 INTO next_num
  FROM public.projetos
  WHERE os ~ '^\d+$';
  
  RETURN LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;