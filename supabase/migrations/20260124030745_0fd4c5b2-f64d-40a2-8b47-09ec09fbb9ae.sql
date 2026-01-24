-- =============================================
-- PRICEBOOK SYSTEM - Preços por Empresa/Região
-- =============================================

-- 1) Tabela de Regiões
CREATE TABLE public.budget_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  uf TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Enum para tipo de pricebook
CREATE TYPE public.pricebook_type AS ENUM ('MATERIAIS', 'MO');

-- 3) Tabela principal de PriceBooks
CREATE TABLE public.pricebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo pricebook_type NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  regiao_id UUID REFERENCES public.budget_regions(id) ON DELETE SET NULL,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  prioridade INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  -- Constraint para garantir unicidade por tipo + empresa + região
  CONSTRAINT pricebooks_unique_context UNIQUE (tipo, empresa_id, regiao_id)
);

-- Índices para busca por precedência
CREATE INDEX idx_pricebooks_tipo ON public.pricebooks(tipo);
CREATE INDEX idx_pricebooks_empresa ON public.pricebooks(empresa_id);
CREATE INDEX idx_pricebooks_regiao ON public.pricebooks(regiao_id);
CREATE INDEX idx_pricebooks_ativo ON public.pricebooks(ativo) WHERE ativo = true;

-- 4) Tabela de Fabricantes (para materiais)
CREATE TABLE public.budget_fabricantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5) Itens de preço de Materiais no PriceBook
CREATE TABLE public.material_pricebook_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pricebook_id UUID NOT NULL REFERENCES public.pricebooks(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES public.material_catalog(id) ON DELETE CASCADE,
  fabricante_id UUID REFERENCES public.budget_fabricantes(id) ON DELETE SET NULL,
  preco DECIMAL(15,4) NOT NULL DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  vigencia_inicio DATE,
  vigencia_fim DATE,
  fonte TEXT DEFAULT 'manual', -- manual | importado
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Um material só pode ter um preço por pricebook (ignorando fabricante para simplificar)
  CONSTRAINT material_pricebook_unique UNIQUE (pricebook_id, catalog_id, fabricante_id)
);

CREATE INDEX idx_material_pricebook_catalog ON public.material_pricebook_items(catalog_id);
CREATE INDEX idx_material_pricebook_pricebook ON public.material_pricebook_items(pricebook_id);

-- 6) Itens de preço de MO (Funções) no PriceBook
-- Opção A: armazenar HH custo final + produtividade
CREATE TABLE public.mo_pricebook_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pricebook_id UUID NOT NULL REFERENCES public.pricebooks(id) ON DELETE CASCADE,
  funcao_id UUID NOT NULL REFERENCES public.budget_labor_roles_catalog(id) ON DELETE CASCADE,
  hh_custo DECIMAL(15,4) NOT NULL DEFAULT 0,
  -- Produtividade pode ser sobrescrita por empresa/região
  produtividade_valor DECIMAL(15,6),
  produtividade_tipo public.budget_productivity_type,
  produtividade_unidade TEXT,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  fonte TEXT DEFAULT 'manual',
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT mo_pricebook_unique UNIQUE (pricebook_id, funcao_id)
);

CREATE INDEX idx_mo_pricebook_funcao ON public.mo_pricebook_items(funcao_id);
CREATE INDEX idx_mo_pricebook_pricebook ON public.mo_pricebook_items(pricebook_id);

-- 7) Adicionar campos de pricebook ao orçamento (revision)
ALTER TABLE public.budget_revisions 
  ADD COLUMN pricebook_materiais_id UUID REFERENCES public.pricebooks(id) ON DELETE SET NULL,
  ADD COLUMN pricebook_mo_id UUID REFERENCES public.pricebooks(id) ON DELETE SET NULL;

-- =============================================
-- FUNÇÕES PARA BUSCAR PREÇO EFETIVO
-- =============================================

-- Função para buscar preço efetivo de material (com precedência)
CREATE OR REPLACE FUNCTION public.get_effective_material_price(
  p_catalog_id UUID,
  p_empresa_id UUID DEFAULT NULL,
  p_regiao_id UUID DEFAULT NULL,
  p_fabricante_id UUID DEFAULT NULL
)
RETURNS TABLE (
  preco DECIMAL(15,4),
  pricebook_id UUID,
  pricebook_nome TEXT,
  origem TEXT,
  fabricante_id UUID
) 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Ordem de precedência: Empresa+Região > Empresa > Região > Global
  RETURN QUERY
  SELECT 
    mpi.preco,
    pb.id as pricebook_id,
    pb.nome as pricebook_nome,
    CASE 
      WHEN pb.empresa_id IS NOT NULL AND pb.regiao_id IS NOT NULL THEN 'EMPRESA_REGIAO'
      WHEN pb.empresa_id IS NOT NULL THEN 'EMPRESA'
      WHEN pb.regiao_id IS NOT NULL THEN 'REGIAO'
      ELSE 'GLOBAL'
    END as origem,
    mpi.fabricante_id
  FROM material_pricebook_items mpi
  JOIN pricebooks pb ON pb.id = mpi.pricebook_id
  WHERE mpi.catalog_id = p_catalog_id
    AND pb.ativo = true
    AND pb.tipo = 'MATERIAIS'
    AND (mpi.fabricante_id = p_fabricante_id OR (p_fabricante_id IS NULL AND mpi.fabricante_id IS NULL))
    AND (
      -- Empresa + Região
      (pb.empresa_id = p_empresa_id AND pb.regiao_id = p_regiao_id)
      OR
      -- Empresa apenas
      (pb.empresa_id = p_empresa_id AND pb.regiao_id IS NULL)
      OR
      -- Região apenas
      (pb.empresa_id IS NULL AND pb.regiao_id = p_regiao_id)
      OR
      -- Global
      (pb.empresa_id IS NULL AND pb.regiao_id IS NULL)
    )
    AND (pb.vigencia_inicio IS NULL OR pb.vigencia_inicio <= CURRENT_DATE)
    AND (pb.vigencia_fim IS NULL OR pb.vigencia_fim >= CURRENT_DATE)
    AND (mpi.vigencia_inicio IS NULL OR mpi.vigencia_inicio <= CURRENT_DATE)
    AND (mpi.vigencia_fim IS NULL OR mpi.vigencia_fim >= CURRENT_DATE)
  ORDER BY 
    CASE 
      WHEN pb.empresa_id IS NOT NULL AND pb.regiao_id IS NOT NULL THEN 1
      WHEN pb.empresa_id IS NOT NULL THEN 2
      WHEN pb.regiao_id IS NOT NULL THEN 3
      ELSE 4
    END,
    pb.prioridade DESC
  LIMIT 1;
END;
$$;

-- Função para buscar HH custo efetivo de MO (com precedência)
CREATE OR REPLACE FUNCTION public.get_effective_mo_price(
  p_funcao_id UUID,
  p_empresa_id UUID DEFAULT NULL,
  p_regiao_id UUID DEFAULT NULL
)
RETURNS TABLE (
  hh_custo DECIMAL(15,4),
  produtividade_valor DECIMAL(15,6),
  produtividade_tipo public.budget_productivity_type,
  produtividade_unidade TEXT,
  pricebook_id UUID,
  pricebook_nome TEXT,
  origem TEXT
) 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Ordem de precedência: Empresa+Região > Empresa > Região > Global
  RETURN QUERY
  SELECT 
    mpi.hh_custo,
    mpi.produtividade_valor,
    mpi.produtividade_tipo,
    mpi.produtividade_unidade,
    pb.id as pricebook_id,
    pb.nome as pricebook_nome,
    CASE 
      WHEN pb.empresa_id IS NOT NULL AND pb.regiao_id IS NOT NULL THEN 'EMPRESA_REGIAO'
      WHEN pb.empresa_id IS NOT NULL THEN 'EMPRESA'
      WHEN pb.regiao_id IS NOT NULL THEN 'REGIAO'
      ELSE 'GLOBAL'
    END as origem
  FROM mo_pricebook_items mpi
  JOIN pricebooks pb ON pb.id = mpi.pricebook_id
  WHERE mpi.funcao_id = p_funcao_id
    AND pb.ativo = true
    AND pb.tipo = 'MO'
    AND (
      (pb.empresa_id = p_empresa_id AND pb.regiao_id = p_regiao_id)
      OR (pb.empresa_id = p_empresa_id AND pb.regiao_id IS NULL)
      OR (pb.empresa_id IS NULL AND pb.regiao_id = p_regiao_id)
      OR (pb.empresa_id IS NULL AND pb.regiao_id IS NULL)
    )
    AND (pb.vigencia_inicio IS NULL OR pb.vigencia_inicio <= CURRENT_DATE)
    AND (pb.vigencia_fim IS NULL OR pb.vigencia_fim >= CURRENT_DATE)
    AND (mpi.vigencia_inicio IS NULL OR mpi.vigencia_inicio <= CURRENT_DATE)
    AND (mpi.vigencia_fim IS NULL OR mpi.vigencia_fim >= CURRENT_DATE)
  ORDER BY 
    CASE 
      WHEN pb.empresa_id IS NOT NULL AND pb.regiao_id IS NOT NULL THEN 1
      WHEN pb.empresa_id IS NOT NULL THEN 2
      WHEN pb.regiao_id IS NOT NULL THEN 3
      ELSE 4
    END,
    pb.prioridade DESC
  LIMIT 1;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.budget_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_fabricantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_pricebook_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mo_pricebook_items ENABLE ROW LEVEL SECURITY;

-- Policies para budget_regions
CREATE POLICY "Authenticated users can view regions"
  ON public.budget_regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert regions"
  ON public.budget_regions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update regions"
  ON public.budget_regions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete regions"
  ON public.budget_regions FOR DELETE TO authenticated USING (true);

-- Policies para pricebooks
CREATE POLICY "Authenticated users can view pricebooks"
  ON public.pricebooks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pricebooks"
  ON public.pricebooks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pricebooks"
  ON public.pricebooks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pricebooks"
  ON public.pricebooks FOR DELETE TO authenticated USING (true);

-- Policies para budget_fabricantes
CREATE POLICY "Authenticated users can view fabricantes"
  ON public.budget_fabricantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fabricantes"
  ON public.budget_fabricantes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fabricantes"
  ON public.budget_fabricantes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fabricantes"
  ON public.budget_fabricantes FOR DELETE TO authenticated USING (true);

-- Policies para material_pricebook_items
CREATE POLICY "Authenticated users can view material prices"
  ON public.material_pricebook_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert material prices"
  ON public.material_pricebook_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update material prices"
  ON public.material_pricebook_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete material prices"
  ON public.material_pricebook_items FOR DELETE TO authenticated USING (true);

-- Policies para mo_pricebook_items
CREATE POLICY "Authenticated users can view mo prices"
  ON public.mo_pricebook_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mo prices"
  ON public.mo_pricebook_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mo prices"
  ON public.mo_pricebook_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete mo prices"
  ON public.mo_pricebook_items FOR DELETE TO authenticated USING (true);

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Criar pricebook global para materiais
INSERT INTO public.pricebooks (nome, tipo, prioridade)
VALUES ('Tabela Global - Materiais', 'MATERIAIS', 0);

-- Criar pricebook global para MO
INSERT INTO public.pricebooks (nome, tipo, prioridade)
VALUES ('Tabela Global - Mão de Obra', 'MO', 0);

-- Algumas regiões iniciais
INSERT INTO public.budget_regions (codigo, nome, uf) VALUES
  ('SUL', 'Região Sul', NULL),
  ('SUDESTE', 'Região Sudeste', NULL),
  ('NORDESTE', 'Região Nordeste', NULL),
  ('NORTE', 'Região Norte', NULL),
  ('CENTRO-OESTE', 'Região Centro-Oeste', NULL),
  ('SP-CAPITAL', 'São Paulo - Capital', 'SP'),
  ('SP-INTERIOR', 'São Paulo - Interior', 'SP'),
  ('RJ-CAPITAL', 'Rio de Janeiro - Capital', 'RJ');

-- Trigger para updated_at em pricebooks
CREATE OR REPLACE FUNCTION public.update_pricebook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_pricebooks_updated_at
  BEFORE UPDATE ON public.pricebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_pricebook_updated_at();

CREATE TRIGGER trg_material_pricebook_updated_at
  BEFORE UPDATE ON public.material_pricebook_items
  FOR EACH ROW EXECUTE FUNCTION public.update_pricebook_updated_at();

CREATE TRIGGER trg_mo_pricebook_updated_at
  BEFORE UPDATE ON public.mo_pricebook_items
  FOR EACH ROW EXECUTE FUNCTION public.update_pricebook_updated_at();