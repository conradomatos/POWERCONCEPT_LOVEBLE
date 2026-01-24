-- Table for equipment catalog inclusion requests
CREATE TABLE public.equipment_catalog_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'mês',
  preco_mensal_ref NUMERIC(14,2),
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_catalog_id UUID REFERENCES public.equipment_catalog(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_catalog_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can create requests
CREATE POLICY "Users can create their own requests"
ON public.equipment_catalog_requests
FOR INSERT
WITH CHECK (auth.uid() = requested_by);

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.equipment_catalog_requests
FOR SELECT
USING (auth.uid() = requested_by);

-- Policy: Catalog managers can view all requests
CREATE POLICY "Catalog managers can view all requests"
ON public.equipment_catalog_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'catalog_manager')
  )
);

-- Policy: Catalog managers can update requests (approve/reject)
CREATE POLICY "Catalog managers can update requests"
ON public.equipment_catalog_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'catalog_manager')
  )
);

-- Index for performance
CREATE INDEX idx_equipment_catalog_requests_status ON public.equipment_catalog_requests(status);
CREATE INDEX idx_equipment_catalog_requests_requested_by ON public.equipment_catalog_requests(requested_by);