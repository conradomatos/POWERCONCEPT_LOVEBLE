
-- ============================================
-- FASE 7: DRE com Dados Reais do Omie
-- ============================================

-- 1. Tabela categorias_contabeis (substitui localStorage)
CREATE TABLE public.categorias_contabeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_nome TEXT NOT NULL,
  grupo_tipo TEXT NOT NULL CHECK (grupo_tipo IN ('Receita', 'Despesa')),
  grupo_ordem INTEGER NOT NULL DEFAULT 0,
  nome TEXT NOT NULL UNIQUE,
  conta_dre TEXT NOT NULL DEFAULT '',
  tipo_gasto TEXT DEFAULT '',
  keywords TEXT[] DEFAULT '{}',
  observacoes TEXT DEFAULT '',
  ativa BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cat_conta_dre ON categorias_contabeis(conta_dre);
CREATE INDEX idx_cat_ativa ON categorias_contabeis(ativa);
CREATE INDEX idx_cat_nome ON categorias_contabeis(nome);

ALTER TABLE categorias_contabeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view categorias" ON categorias_contabeis
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admin/Financeiro can insert categorias" ON categorias_contabeis
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin/Financeiro can update categorias" ON categorias_contabeis
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin can delete categorias" ON categorias_contabeis
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 2. Tabela omie_categoria_mapeamento
CREATE TABLE public.omie_categoria_mapeamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_omie TEXT NOT NULL UNIQUE,
  descricao_omie TEXT,
  categoria_contabil_id UUID REFERENCES categorias_contabeis(id) ON DELETE SET NULL,
  conta_dre_override TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_map_codigo ON omie_categoria_mapeamento(codigo_omie);
CREATE INDEX idx_map_cat_id ON omie_categoria_mapeamento(categoria_contabil_id);

ALTER TABLE omie_categoria_mapeamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view mapeamento" ON omie_categoria_mapeamento
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admin/Financeiro can insert mapeamento" ON omie_categoria_mapeamento
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin/Financeiro can update mapeamento" ON omie_categoria_mapeamento
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admin/Financeiro can delete mapeamento" ON omie_categoria_mapeamento
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 3. ALTER TABLE: adicionar colunas às tabelas omie existentes
ALTER TABLE omie_contas_receber 
  ADD COLUMN IF NOT EXISTS valor_inss NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ir NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_iss NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pis NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_cofins NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_csll NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categorias_rateio JSONB,
  ADD COLUMN IF NOT EXISTS codigo_tipo_documento TEXT,
  ADD COLUMN IF NOT EXISTS id_conta_corrente BIGINT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB;

ALTER TABLE omie_contas_pagar 
  ADD COLUMN IF NOT EXISTS valor_inss NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ir NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_iss NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pis NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_cofins NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_csll NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categorias_rateio JSONB,
  ADD COLUMN IF NOT EXISTS codigo_tipo_documento TEXT,
  ADD COLUMN IF NOT EXISTS id_conta_corrente BIGINT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Trigger updated_at para novas tabelas
CREATE TRIGGER update_categorias_contabeis_updated_at
  BEFORE UPDATE ON categorias_contabeis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_omie_categoria_mapeamento_updated_at
  BEFORE UPDATE ON omie_categoria_mapeamento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
