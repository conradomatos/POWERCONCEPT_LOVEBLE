-- Create material_catalog_variants table for manufacturer-specific pricing
CREATE TABLE public.material_catalog_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES public.material_catalog(id) ON DELETE CASCADE,
  fabricante TEXT NOT NULL,
  sku TEXT,
  preco_ref NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (catalog_id, fabricante)
);

-- Create price history table for auditing
CREATE TABLE public.material_variant_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES public.material_catalog_variants(id) ON DELETE CASCADE,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  import_run_id UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.material_catalog_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_variant_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for material_catalog_variants
CREATE POLICY "Usuários autenticados podem ver variantes"
ON public.material_catalog_variants
FOR SELECT
USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar variantes"
ON public.material_catalog_variants
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies for price history
CREATE POLICY "Usuários autenticados podem ver histórico de preços"
ON public.material_variant_price_history
FOR SELECT
USING (true);

CREATE POLICY "Admin e financeiro podem inserir histórico"
ON public.material_variant_price_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_material_catalog_variants_updated_at
BEFORE UPDATE ON public.material_catalog_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_material_variants_catalog_id ON public.material_catalog_variants(catalog_id);
CREATE INDEX idx_material_variants_fabricante ON public.material_catalog_variants(fabricante);
CREATE INDEX idx_variant_price_history_variant_id ON public.material_variant_price_history(variant_id);