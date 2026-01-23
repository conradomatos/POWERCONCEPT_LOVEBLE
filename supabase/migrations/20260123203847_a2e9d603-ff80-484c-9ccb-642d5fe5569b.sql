-- =============================================
-- MÓDULO ORÇAMENTOS - FASE 1: Estrutura Base
-- =============================================

-- 1. ENUMS
-- =============================================

-- Status de revisão do orçamento
CREATE TYPE revision_status AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CANCELED');

-- Tipo de nó na estrutura WBS
CREATE TYPE wbs_type AS ENUM ('CHAPTER', 'PACKAGE', 'ACTIVITY');

-- Tipo de fornecimento de material
CREATE TYPE supply_type AS ENUM ('CONCEPT', 'CLIENTE', 'TERCEIRO', 'A_DEFINIR');

-- Modalidade de contratação MO
CREATE TYPE labor_modality AS ENUM ('CLT', 'PACOTE');

-- Origem do HH alocado
CREATE TYPE hh_origin AS ENUM ('MATERIAIS', 'MANUAL');

-- Tipo de item de engenharia
CREATE TYPE eng_type AS ENUM ('HH', 'FECHADO');

-- Tipo de valor de imposto
CREATE TYPE tax_value_type AS ENUM ('PERCENT', 'FIXED');

-- Base de cálculo do imposto
CREATE TYPE tax_base AS ENUM ('SALE', 'COST');

-- Escopo do imposto
CREATE TYPE tax_scope AS ENUM ('ALL', 'MATERIALS', 'SERVICES');

-- Status de material gerado
CREATE TYPE gen_status AS ENUM ('PENDENTE', 'APLICADO');

-- 2. TABELAS PRINCIPAIS
-- =============================================

-- budgets: Container principal do orçamento
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  obra_nome TEXT NOT NULL,
  local TEXT,
  responsavel_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para budgets
CREATE INDEX idx_budgets_cliente ON public.budgets(cliente_id);
CREATE INDEX idx_budgets_responsavel ON public.budgets(responsavel_user_id);
CREATE INDEX idx_budgets_number ON public.budgets(budget_number);

-- budget_revisions: Revisões/versões do orçamento
CREATE TABLE public.budget_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  revision_number INT NOT NULL DEFAULT 0,
  status revision_status NOT NULL DEFAULT 'DRAFT',
  validade_proposta DATE,
  prazo_execucao_meses INT CHECK (prazo_execucao_meses >= 0),
  observacoes TEXT,
  premissas TEXT,
  exclusoes TEXT,
  condicoes_pagamento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  projeto_id UUID REFERENCES public.projetos(id),
  UNIQUE(budget_id, revision_number)
);

-- Índices para budget_revisions
CREATE INDEX idx_budget_revisions_budget ON public.budget_revisions(budget_id);
CREATE INDEX idx_budget_revisions_status ON public.budget_revisions(status);

-- budget_wbs: Estrutura hierárquica WBS
CREATE TABLE public.budget_wbs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  nome TEXT NOT NULL,
  parent_id UUID REFERENCES public.budget_wbs(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  tipo wbs_type NOT NULL DEFAULT 'PACKAGE',
  UNIQUE(revision_id, code)
);

-- Índices para budget_wbs
CREATE INDEX idx_budget_wbs_revision ON public.budget_wbs(revision_id);
CREATE INDEX idx_budget_wbs_parent ON public.budget_wbs(parent_id);

-- material_catalog: Base de materiais para autocomplete
CREATE TABLE public.material_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_ref DECIMAL(15,2),
  hh_unit_ref DECIMAL(10,3),
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para material_catalog
CREATE INDEX idx_material_catalog_codigo ON public.material_catalog(codigo);
CREATE INDEX idx_material_catalog_descricao ON public.material_catalog USING gin(to_tsvector('portuguese', descricao));
CREATE INDEX idx_material_catalog_ativo ON public.material_catalog(ativo) WHERE ativo = true;

-- budget_material_items: Levantamento de materiais
CREATE TABLE public.budget_material_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  wbs_id UUID REFERENCES public.budget_wbs(id) ON DELETE SET NULL,
  item_seq INT NOT NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  fornecimento supply_type NOT NULL DEFAULT 'A_DEFINIR',
  hh_unitario DECIMAL(10,4) NOT NULL DEFAULT 0 CHECK (hh_unitario >= 0),
  fator_dificuldade DECIMAL(6,3) NOT NULL DEFAULT 1 CHECK (fator_dificuldade >= 0),
  hh_total DECIMAL(15,4) NOT NULL DEFAULT 0,
  preco_unit DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (preco_unit >= 0),
  preco_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  UNIQUE(revision_id, item_seq)
);

-- Índices para budget_material_items
CREATE INDEX idx_budget_material_items_revision ON public.budget_material_items(revision_id);
CREATE INDEX idx_budget_material_items_wbs ON public.budget_material_items(wbs_id);

-- budget_summary: Resumo consolidado por revisão
CREATE TABLE public.budget_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL UNIQUE REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  total_materiais DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_hh_materiais DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_mo DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_equipamentos DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_engenharia DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_mobilizacao DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_canteiro DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal_custo DECIMAL(15,2) NOT NULL DEFAULT 0,
  markup_pct_aplicado DECIMAL(6,3) NOT NULL DEFAULT 0,
  valor_markup DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_impostos DECIMAL(15,2) NOT NULL DEFAULT 0,
  preco_venda DECIMAL(15,2) NOT NULL DEFAULT 0,
  margem_rs DECIMAL(15,2) NOT NULL DEFAULT 0,
  margem_pct DECIMAL(6,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. TRIGGERS PARA CÁLCULOS AUTOMÁTICOS
-- =============================================

-- Função para calcular hh_total e preco_total em materiais
CREATE OR REPLACE FUNCTION public.calculate_material_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hh_total := NEW.quantidade * NEW.hh_unitario * NEW.fator_dificuldade;
  NEW.preco_total := NEW.quantidade * NEW.preco_unit;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para calcular totais de materiais
CREATE TRIGGER trg_calculate_material_totals
  BEFORE INSERT OR UPDATE ON public.budget_material_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_material_totals();

-- Trigger para updated_at em budgets
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em material_catalog
CREATE TRIGGER update_material_catalog_updated_at
  BEFORE UPDATE ON public.material_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em budget_summary
CREATE TRIGGER update_budget_summary_updated_at
  BEFORE UPDATE ON public.budget_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. FUNÇÃO PARA GERAR PRÓXIMO NÚMERO DE ORÇAMENTO
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_next_budget_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_num INTEGER;
  max_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT MAX(budget_number) INTO max_number
  FROM public.budgets
  WHERE budget_number LIKE 'ORC-' || current_year || '-%';
  
  IF max_number IS NULL THEN
    next_num := 1;
  ELSE
    next_num := SUBSTRING(max_number FROM 'ORC-\d{4}-(\d+)')::INTEGER + 1;
  END IF;
  
  RETURN 'ORC-' || current_year || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. ROW LEVEL SECURITY
-- =============================================

-- Habilitar RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_wbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_material_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_summary ENABLE ROW LEVEL SECURITY;

-- Políticas para budgets
CREATE POLICY "Usuários autenticados podem ver orçamentos"
  ON public.budgets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e financeiro podem criar orçamentos"
  ON public.budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admin e financeiro podem editar orçamentos"
  ON public.budgets FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Apenas admin pode deletar orçamentos"
  ON public.budgets FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- Políticas para budget_revisions
CREATE POLICY "Usuários autenticados podem ver revisões"
  ON public.budget_revisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e financeiro podem criar revisões"
  ON public.budget_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admin e financeiro podem editar revisões"
  ON public.budget_revisions FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Apenas admin pode deletar revisões"
  ON public.budget_revisions FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- Políticas para budget_wbs
CREATE POLICY "Usuários autenticados podem ver WBS"
  ON public.budget_wbs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar WBS"
  ON public.budget_wbs FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- Políticas para budget_material_items
CREATE POLICY "Usuários autenticados podem ver materiais"
  ON public.budget_material_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar materiais"
  ON public.budget_material_items FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- Políticas para material_catalog
CREATE POLICY "Usuários autenticados podem ver catálogo"
  ON public.material_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar catálogo"
  ON public.material_catalog FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );

-- Políticas para budget_summary
CREATE POLICY "Usuários autenticados podem ver resumo"
  ON public.budget_summary FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar resumo"
  ON public.budget_summary FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'financeiro') OR 
    has_role(auth.uid(), 'super_admin')
  );