-- =====================================================
-- CATÁLOGO DE FUNÇÕES DE MÃO DE OBRA - MÓDULO ORÇAMENTO
-- =====================================================

-- Enums para tipos
CREATE TYPE budget_labor_type AS ENUM ('MOD', 'MOI');
CREATE TYPE budget_labor_regime AS ENUM ('CLT', 'PL');
CREATE TYPE budget_productivity_type AS ENUM ('HH_POR_UN', 'UN_POR_HH');

-- =====================================================
-- Grupos de Funções
-- =====================================================
CREATE TABLE budget_labor_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE budget_labor_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_groups"
  ON budget_labor_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_groups"
  ON budget_labor_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update budget_labor_groups"
  ON budget_labor_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete budget_labor_groups"
  ON budget_labor_groups FOR DELETE TO authenticated USING (true);

-- =====================================================
-- Categorias de Funções (vinculadas a grupos)
-- =====================================================
CREATE TABLE budget_labor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES budget_labor_groups(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, nome)
);

ALTER TABLE budget_labor_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_categories"
  ON budget_labor_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_categories"
  ON budget_labor_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update budget_labor_categories"
  ON budget_labor_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete budget_labor_categories"
  ON budget_labor_categories FOR DELETE TO authenticated USING (true);

-- =====================================================
-- Tags de Funções
-- =====================================================
CREATE TABLE budget_labor_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE budget_labor_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_tags"
  ON budget_labor_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_tags"
  ON budget_labor_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update budget_labor_tags"
  ON budget_labor_tags FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete budget_labor_tags"
  ON budget_labor_tags FOR DELETE TO authenticated USING (true);

-- =====================================================
-- Conjuntos de Encargos/Impostos/Provisões
-- =====================================================
CREATE TABLE budget_labor_charge_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  encargos_sociais_pct NUMERIC(8,4) DEFAULT 0,
  fgts_pct NUMERIC(8,4) DEFAULT 0,
  inss_pct NUMERIC(8,4) DEFAULT 0,
  outros_impostos_pct NUMERIC(8,4) DEFAULT 0,
  provisao_ferias_pct NUMERIC(8,4) DEFAULT 0,
  provisao_13o_pct NUMERIC(8,4) DEFAULT 0,
  provisao_rescisao_pct NUMERIC(8,4) DEFAULT 0,
  vale_transporte_pct NUMERIC(8,4) DEFAULT 0,
  vale_refeicao_pct NUMERIC(8,4) DEFAULT 0,
  plano_saude_pct NUMERIC(8,4) DEFAULT 0,
  outros_beneficios_pct NUMERIC(8,4) DEFAULT 0,
  total_encargos_pct NUMERIC(8,4) GENERATED ALWAYS AS (
    encargos_sociais_pct + fgts_pct + inss_pct + outros_impostos_pct +
    provisao_ferias_pct + provisao_13o_pct + provisao_rescisao_pct +
    vale_transporte_pct + vale_refeicao_pct + plano_saude_pct + outros_beneficios_pct
  ) STORED,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE budget_labor_charge_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_charge_sets"
  ON budget_labor_charge_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_charge_sets"
  ON budget_labor_charge_sets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update budget_labor_charge_sets"
  ON budget_labor_charge_sets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete budget_labor_charge_sets"
  ON budget_labor_charge_sets FOR DELETE TO authenticated USING (true);

-- =====================================================
-- Catálogo Principal de Funções de MO
-- =====================================================
CREATE TABLE budget_labor_roles_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo_mo budget_labor_type NOT NULL DEFAULT 'MOD',
  regime budget_labor_regime NOT NULL DEFAULT 'CLT',
  carga_horaria_mensal NUMERIC(8,2) DEFAULT 220,
  salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  beneficios_mensal NUMERIC(12,2) DEFAULT 0,
  periculosidade_pct NUMERIC(8,4) DEFAULT 0,
  insalubridade_pct NUMERIC(8,4) DEFAULT 0,
  charge_set_id UUID REFERENCES budget_labor_charge_sets(id) ON DELETE SET NULL,
  hh_custo NUMERIC(12,4) DEFAULT 0,
  produtividade_valor NUMERIC(12,4),
  produtividade_tipo budget_productivity_type DEFAULT 'HH_POR_UN',
  produtividade_unidade TEXT,
  group_id UUID REFERENCES budget_labor_groups(id) ON DELETE SET NULL,
  category_id UUID REFERENCES budget_labor_categories(id) ON DELETE SET NULL,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE budget_labor_roles_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_roles_catalog"
  ON budget_labor_roles_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_roles_catalog"
  ON budget_labor_roles_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update budget_labor_roles_catalog"
  ON budget_labor_roles_catalog FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete budget_labor_roles_catalog"
  ON budget_labor_roles_catalog FOR DELETE TO authenticated USING (true);

-- Índices para performance
CREATE INDEX idx_budget_labor_roles_catalog_codigo ON budget_labor_roles_catalog(codigo);
CREATE INDEX idx_budget_labor_roles_catalog_tipo_mo ON budget_labor_roles_catalog(tipo_mo);
CREATE INDEX idx_budget_labor_roles_catalog_regime ON budget_labor_roles_catalog(regime);
CREATE INDEX idx_budget_labor_roles_catalog_group_id ON budget_labor_roles_catalog(group_id);
CREATE INDEX idx_budget_labor_roles_catalog_category_id ON budget_labor_roles_catalog(category_id);
CREATE INDEX idx_budget_labor_roles_catalog_charge_set_id ON budget_labor_roles_catalog(charge_set_id);

-- =====================================================
-- Junction Table: Tags para Funções
-- =====================================================
CREATE TABLE budget_labor_catalog_tags (
  role_id UUID NOT NULL REFERENCES budget_labor_roles_catalog(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES budget_labor_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, tag_id)
);

ALTER TABLE budget_labor_catalog_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_catalog_tags"
  ON budget_labor_catalog_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_catalog_tags"
  ON budget_labor_catalog_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete budget_labor_catalog_tags"
  ON budget_labor_catalog_tags FOR DELETE TO authenticated USING (true);

-- =====================================================
-- Histórico de Alterações
-- =====================================================
CREATE TABLE budget_labor_roles_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES budget_labor_roles_catalog(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID,
  change_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'IMPORT'
  import_run_id UUID,
  old_values JSONB,
  new_values JSONB
);

ALTER TABLE budget_labor_roles_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_roles_history"
  ON budget_labor_roles_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_roles_history"
  ON budget_labor_roles_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_budget_labor_roles_history_role_id ON budget_labor_roles_history(role_id);
CREATE INDEX idx_budget_labor_roles_history_changed_at ON budget_labor_roles_history(changed_at);

-- =====================================================
-- Registros de Importação
-- =====================================================
CREATE TABLE budget_labor_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  total_rows INT DEFAULT 0,
  created_count INT DEFAULT 0,
  updated_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  imported_at TIMESTAMPTZ DEFAULT now(),
  imported_by UUID
);

ALTER TABLE budget_labor_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read budget_labor_import_runs"
  ON budget_labor_import_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert budget_labor_import_runs"
  ON budget_labor_import_runs FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- Função para calcular HH Custo
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_budget_labor_hh_custo(
  p_salario_base NUMERIC,
  p_beneficios_mensal NUMERIC,
  p_periculosidade_pct NUMERIC,
  p_insalubridade_pct NUMERIC,
  p_total_encargos_pct NUMERIC,
  p_carga_horaria_mensal NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_salario_ajustado NUMERIC;
  v_custo_mensal_total NUMERIC;
  v_hh_custo NUMERIC;
BEGIN
  IF p_carga_horaria_mensal <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Salário ajustado com periculosidade e insalubridade
  v_salario_ajustado := p_salario_base * (1 + COALESCE(p_periculosidade_pct, 0) / 100 + COALESCE(p_insalubridade_pct, 0) / 100);
  
  -- Custo mensal total = salário ajustado + encargos + benefícios
  v_custo_mensal_total := v_salario_ajustado * (1 + COALESCE(p_total_encargos_pct, 0) / 100) + COALESCE(p_beneficios_mensal, 0);
  
  -- HH custo = custo mensal / carga horária
  v_hh_custo := v_custo_mensal_total / p_carga_horaria_mensal;
  
  RETURN ROUND(v_hh_custo, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Trigger para atualizar hh_custo automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_budget_labor_hh_custo()
RETURNS TRIGGER AS $$
DECLARE
  v_total_encargos_pct NUMERIC;
BEGIN
  -- Buscar total de encargos do conjunto
  SELECT COALESCE(total_encargos_pct, 0) INTO v_total_encargos_pct
  FROM budget_labor_charge_sets
  WHERE id = NEW.charge_set_id;
  
  IF v_total_encargos_pct IS NULL THEN
    v_total_encargos_pct := 0;
  END IF;
  
  -- Calcular hh_custo
  NEW.hh_custo := calculate_budget_labor_hh_custo(
    NEW.salario_base,
    NEW.beneficios_mensal,
    NEW.periculosidade_pct,
    NEW.insalubridade_pct,
    v_total_encargos_pct,
    NEW.carga_horaria_mensal
  );
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_budget_labor_hh_custo
BEFORE INSERT OR UPDATE ON budget_labor_roles_catalog
FOR EACH ROW
EXECUTE FUNCTION update_budget_labor_hh_custo();

-- =====================================================
-- Trigger para registrar histórico
-- =====================================================
CREATE OR REPLACE FUNCTION log_budget_labor_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO budget_labor_roles_history (role_id, change_type, new_values)
    VALUES (NEW.id, 'CREATE', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Só registra se campos importantes mudaram
    IF OLD.salario_base IS DISTINCT FROM NEW.salario_base
       OR OLD.hh_custo IS DISTINCT FROM NEW.hh_custo
       OR OLD.produtividade_valor IS DISTINCT FROM NEW.produtividade_valor
       OR OLD.charge_set_id IS DISTINCT FROM NEW.charge_set_id
       OR OLD.beneficios_mensal IS DISTINCT FROM NEW.beneficios_mensal
       OR OLD.periculosidade_pct IS DISTINCT FROM NEW.periculosidade_pct
    THEN
      INSERT INTO budget_labor_roles_history (role_id, change_type, old_values, new_values)
      VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_budget_labor_role_changes
AFTER INSERT OR UPDATE ON budget_labor_roles_catalog
FOR EACH ROW
EXECUTE FUNCTION log_budget_labor_role_changes();

-- =====================================================
-- Inserir conjunto de encargos padrão
-- =====================================================
INSERT INTO budget_labor_charge_sets (nome, descricao, encargos_sociais_pct, fgts_pct, inss_pct, provisao_ferias_pct, provisao_13o_pct, provisao_rescisao_pct)
VALUES 
  ('CLT Padrão', 'Encargos padrão para regime CLT', 20.0, 8.0, 20.0, 11.11, 8.33, 4.0),
  ('CLT Periculoso', 'CLT com adicional de periculosidade', 22.0, 8.0, 20.0, 11.11, 8.33, 4.5),
  ('PJ Simples', 'Regime PJ sem encargos trabalhistas', 0, 0, 0, 0, 0, 0);

-- =====================================================
-- View para catálogo com dados relacionados
-- =====================================================
CREATE OR REPLACE VIEW vw_budget_labor_roles_catalog AS
SELECT 
  r.*,
  g.nome as group_nome,
  c.nome as category_nome,
  cs.nome as charge_set_nome,
  cs.total_encargos_pct
FROM budget_labor_roles_catalog r
LEFT JOIN budget_labor_groups g ON g.id = r.group_id
LEFT JOIN budget_labor_categories c ON c.id = r.category_id
LEFT JOIN budget_labor_charge_sets cs ON cs.id = r.charge_set_id;