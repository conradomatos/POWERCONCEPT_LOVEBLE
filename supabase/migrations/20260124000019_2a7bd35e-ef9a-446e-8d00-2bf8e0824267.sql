-- Create material_catalog_price_history table for audit trail
CREATE TABLE public.material_catalog_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.material_catalog(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  old_price NUMERIC,
  new_price NUMERIC,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  import_run_id UUID REFERENCES public.arquivos_importacao(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.material_catalog_price_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for price history
CREATE POLICY "Users with roles can view price history"
ON public.material_catalog_price_history
FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Financeiro can insert price history"
ON public.material_catalog_price_history
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'financeiro') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Add new columns to arquivos_importacao for catalog imports
ALTER TABLE public.arquivos_importacao 
ADD COLUMN IF NOT EXISTS tipo TEXT,
ADD COLUMN IF NOT EXISTS resumo_json JSONB;

-- Create index for faster lookups
CREATE INDEX idx_material_price_history_catalog ON public.material_catalog_price_history(catalog_id);
CREATE INDEX idx_material_price_history_import ON public.material_catalog_price_history(import_run_id);
CREATE INDEX idx_arquivos_importacao_tipo ON public.arquivos_importacao(tipo);