-- Create empresa_status enum
CREATE TYPE public.empresa_status AS ENUM ('ativo', 'inativo');

-- Create empresas table
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  segmento TEXT NOT NULL,
  unidade TEXT NOT NULL,
  status empresa_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Create projetos table
CREATE TABLE public.projetos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS on empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Enable RLS on projetos
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

-- RLS policies for empresas
CREATE POLICY "Authenticated users with roles can view empresas" 
ON public.empresas 
FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert empresas" 
ON public.empresas 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update empresas" 
ON public.empresas 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete empresas" 
ON public.empresas 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for projetos
CREATE POLICY "Authenticated users with roles can view projetos" 
ON public.projetos 
FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert projetos" 
ON public.projetos 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update projetos" 
ON public.projetos 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete projetos" 
ON public.projetos 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on empresas
CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on projetos
CREATE TRIGGER update_projetos_updated_at
BEFORE UPDATE ON public.projetos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for empresa_id on projetos
CREATE INDEX idx_projetos_empresa_id ON public.projetos(empresa_id);