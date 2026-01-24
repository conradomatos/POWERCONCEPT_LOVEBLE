-- =====================================================
-- ADICIONAR ROLE catalog_manager ao enum existente
-- =====================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'catalog_manager';

-- =====================================================
-- Função para verificar se usuário é catalog_manager ou super_admin
-- Usando TEXT casting para evitar problemas com enum
-- =====================================================
CREATE OR REPLACE FUNCTION is_catalog_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('super_admin', 'catalog_manager')
  )
$$;

-- =====================================================
-- EQUIPMENT CATALOG - Base Global de Equipamentos
-- =====================================================

-- 1) Hierarquia de Equipamentos
CREATE TABLE IF NOT EXISTS equipment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES equipment_groups(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, nome)
);

CREATE TABLE IF NOT EXISTS equipment_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES equipment_categories(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, nome)
);

-- 2) Tags de Equipamentos
CREATE TABLE IF NOT EXISTS equipment_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Catálogo Global de Equipamentos
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'mês',
  preco_mensal_ref NUMERIC(15,2) DEFAULT 0,
  group_id UUID REFERENCES equipment_groups(id) ON DELETE SET NULL,
  category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES equipment_subcategories(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  observacao TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Relação Equipamento <-> Tags
CREATE TABLE IF NOT EXISTS equipment_catalog_tags (
  equipment_id UUID REFERENCES equipment_catalog(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES equipment_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (equipment_id, tag_id)
);

-- 5) Histórico de Preços (auditoria)
CREATE TABLE IF NOT EXISTS equipment_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment_catalog(id) ON DELETE CASCADE,
  preco_anterior NUMERIC(15,2),
  preco_novo NUMERIC(15,2),
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- 6) Registro de Importações
CREATE TABLE IF NOT EXISTS equipment_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  total_rows INT DEFAULT 0,
  created_count INT DEFAULT 0,
  updated_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  imported_by UUID,
  imported_at TIMESTAMPTZ DEFAULT now()
);

-- 7) Itens de Equipamento no Orçamento (por revisão)
CREATE TABLE IF NOT EXISTS budget_equipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES budget_revisions(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES equipment_catalog(id) ON DELETE SET NULL,
  codigo_snapshot TEXT,
  descricao_snapshot TEXT NOT NULL,
  unidade_snapshot TEXT DEFAULT 'mês',
  preco_mensal_ref_snapshot NUMERIC(15,2) DEFAULT 0,
  preco_mensal_override NUMERIC(15,2),
  qtd NUMERIC(10,2) DEFAULT 1,
  meses NUMERIC(10,2) DEFAULT 1,
  total NUMERIC(15,2) GENERATED ALWAYS AS (
    qtd * meses * COALESCE(preco_mensal_override, preco_mensal_ref_snapshot)
  ) STORED,
  observacao TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_codigo ON equipment_catalog(codigo);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_group ON equipment_catalog(group_id);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category ON equipment_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_ativo ON equipment_catalog(ativo);
CREATE INDEX IF NOT EXISTS idx_budget_equipment_items_revision ON budget_equipment_items(revision_id);
CREATE INDEX IF NOT EXISTS idx_budget_equipment_items_catalog ON budget_equipment_items(catalog_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_equipment_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_catalog_updated_at ON equipment_catalog;
CREATE TRIGGER trg_equipment_catalog_updated_at
  BEFORE UPDATE ON equipment_catalog
  FOR EACH ROW EXECUTE FUNCTION update_equipment_catalog_updated_at();

CREATE OR REPLACE FUNCTION log_equipment_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.preco_mensal_ref IS DISTINCT FROM NEW.preco_mensal_ref THEN
    INSERT INTO equipment_price_history (equipment_id, preco_anterior, preco_novo, changed_by)
    VALUES (NEW.id, OLD.preco_mensal_ref, NEW.preco_mensal_ref, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_price_history ON equipment_catalog;
CREATE TRIGGER trg_equipment_price_history
  AFTER UPDATE ON equipment_catalog
  FOR EACH ROW EXECUTE FUNCTION log_equipment_price_change();

CREATE OR REPLACE FUNCTION update_budget_equipment_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_equipment_items_updated_at ON budget_equipment_items;
CREATE TRIGGER trg_budget_equipment_items_updated_at
  BEFORE UPDATE ON budget_equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_budget_equipment_items_updated_at();

-- =====================================================
-- VIEW para catálogo com hierarquia
-- =====================================================
CREATE OR REPLACE VIEW vw_equipment_catalog AS
SELECT 
  ec.*,
  eg.nome AS group_nome,
  ecat.nome AS category_nome,
  esub.nome AS subcategory_nome,
  COALESCE(eg.nome, '') || 
    CASE WHEN ecat.nome IS NOT NULL THEN ' / ' || ecat.nome ELSE '' END ||
    CASE WHEN esub.nome IS NOT NULL THEN ' / ' || esub.nome ELSE '' END AS hierarquia_path,
  (
    SELECT array_agg(et.nome ORDER BY et.nome)
    FROM equipment_catalog_tags ect
    JOIN equipment_tags et ON et.id = ect.tag_id
    WHERE ect.equipment_id = ec.id
  ) AS tags
FROM equipment_catalog ec
LEFT JOIN equipment_groups eg ON eg.id = ec.group_id
LEFT JOIN equipment_categories ecat ON ecat.id = ec.category_id
LEFT JOIN equipment_subcategories esub ON esub.id = ec.subcategory_id;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE equipment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_catalog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_equipment_items ENABLE ROW LEVEL SECURITY;

-- Policies para hierarquia
CREATE POLICY "equipment_groups_select" ON equipment_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_groups_insert" ON equipment_groups FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());
CREATE POLICY "equipment_groups_update" ON equipment_groups FOR UPDATE TO authenticated USING (is_catalog_manager());
CREATE POLICY "equipment_groups_delete" ON equipment_groups FOR DELETE TO authenticated USING (is_catalog_manager());

CREATE POLICY "equipment_categories_select" ON equipment_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_categories_insert" ON equipment_categories FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());
CREATE POLICY "equipment_categories_update" ON equipment_categories FOR UPDATE TO authenticated USING (is_catalog_manager());
CREATE POLICY "equipment_categories_delete" ON equipment_categories FOR DELETE TO authenticated USING (is_catalog_manager());

CREATE POLICY "equipment_subcategories_select" ON equipment_subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_subcategories_insert" ON equipment_subcategories FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());
CREATE POLICY "equipment_subcategories_update" ON equipment_subcategories FOR UPDATE TO authenticated USING (is_catalog_manager());
CREATE POLICY "equipment_subcategories_delete" ON equipment_subcategories FOR DELETE TO authenticated USING (is_catalog_manager());

CREATE POLICY "equipment_tags_select" ON equipment_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_tags_insert" ON equipment_tags FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());
CREATE POLICY "equipment_tags_update" ON equipment_tags FOR UPDATE TO authenticated USING (is_catalog_manager());
CREATE POLICY "equipment_tags_delete" ON equipment_tags FOR DELETE TO authenticated USING (is_catalog_manager());

CREATE POLICY "equipment_catalog_tags_select" ON equipment_catalog_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_catalog_tags_insert" ON equipment_catalog_tags FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());
CREATE POLICY "equipment_catalog_tags_delete" ON equipment_catalog_tags FOR DELETE TO authenticated USING (is_catalog_manager());

CREATE POLICY "equipment_catalog_select" ON equipment_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_catalog_insert" ON equipment_catalog FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());
CREATE POLICY "equipment_catalog_update" ON equipment_catalog FOR UPDATE TO authenticated USING (is_catalog_manager());
CREATE POLICY "equipment_catalog_delete" ON equipment_catalog FOR DELETE TO authenticated USING (is_catalog_manager());

CREATE POLICY "equipment_price_history_select" ON equipment_price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_price_history_insert" ON equipment_price_history FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());

CREATE POLICY "equipment_import_runs_select" ON equipment_import_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_import_runs_insert" ON equipment_import_runs FOR INSERT TO authenticated WITH CHECK (is_catalog_manager());

CREATE POLICY "budget_equipment_items_select" ON budget_equipment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_equipment_items_insert" ON budget_equipment_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "budget_equipment_items_update" ON budget_equipment_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "budget_equipment_items_delete" ON budget_equipment_items FOR DELETE TO authenticated USING (true);