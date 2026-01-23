
-- =====================================================
-- FASE 2: Mão de Obra e Indiretos
-- =====================================================

-- 1. Tabela: labor_roles (funções de MO por revisão)
CREATE TABLE public.labor_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  funcao TEXT NOT NULL,
  salario_base NUMERIC NOT NULL DEFAULT 0 CHECK (salario_base >= 0),
  carga_horaria_mensal NUMERIC NOT NULL DEFAULT 220 CHECK (carga_horaria_mensal >= 1),
  modalidade labor_modality NOT NULL DEFAULT 'CLT',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(revision_id, funcao)
);

-- 2. Tabela: labor_parameters (parâmetros globais MO por revisão)
CREATE TABLE public.labor_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL UNIQUE REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  encargos_pct NUMERIC NOT NULL DEFAULT 0 CHECK (encargos_pct >= 0),
  he50_pct NUMERIC NOT NULL DEFAULT 50 CHECK (he50_pct >= 0),
  he100_pct NUMERIC NOT NULL DEFAULT 100 CHECK (he100_pct >= 0),
  adicional_noturno_pct NUMERIC NOT NULL DEFAULT 0 CHECK (adicional_noturno_pct >= 0),
  periculosidade_pct NUMERIC NOT NULL DEFAULT 30 CHECK (periculosidade_pct >= 0),
  insalubridade_pct NUMERIC NOT NULL DEFAULT 0 CHECK (insalubridade_pct >= 0),
  improdutividade_pct NUMERIC NOT NULL DEFAULT 0 CHECK (improdutividade_pct >= 0),
  custos_pessoa_json JSONB DEFAULT '{}',
  incidencias_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela: labor_cost_snapshot (custo hora calculado por função)
CREATE TABLE public.labor_cost_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  labor_role_id UUID NOT NULL REFERENCES public.labor_roles(id) ON DELETE CASCADE,
  custo_hora_normal NUMERIC NOT NULL DEFAULT 0,
  custo_hora_he50 NUMERIC NOT NULL DEFAULT 0,
  custo_hora_he100 NUMERIC NOT NULL DEFAULT 0,
  memoria_json JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(revision_id, labor_role_id)
);

-- 4. Tabela: labor_hh_allocations (consumo HH por pacote/função)
CREATE TABLE public.labor_hh_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  wbs_id UUID REFERENCES public.budget_wbs(id) ON DELETE SET NULL,
  origem hh_origin NOT NULL DEFAULT 'MANUAL',
  descricao TEXT NOT NULL,
  labor_role_id UUID NOT NULL REFERENCES public.labor_roles(id) ON DELETE CASCADE,
  hh_normais NUMERIC NOT NULL DEFAULT 0 CHECK (hh_normais >= 0),
  hh_50 NUMERIC NOT NULL DEFAULT 0 CHECK (hh_50 >= 0),
  hh_100 NUMERIC NOT NULL DEFAULT 0 CHECK (hh_100 >= 0),
  hh_total NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela: mobilization_items (mobilização/desmobilização)
CREATE TABLE public.mobilization_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  wbs_id UUID REFERENCES public.budget_wbs(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  unidade TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  valor_unitario NUMERIC NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela: site_maintenance_items (manutenção de canteiro)
CREATE TABLE public.site_maintenance_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor_mensal NUMERIC NOT NULL DEFAULT 0 CHECK (valor_mensal >= 0),
  meses INTEGER NOT NULL DEFAULT 1 CHECK (meses >= 0),
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela: equipment_rentals (locação de equipamentos)
CREATE TABLE public.equipment_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  valor_mensal NUMERIC NOT NULL DEFAULT 0 CHECK (valor_mensal >= 0),
  meses INTEGER NOT NULL DEFAULT 1 CHECK (meses >= 0),
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Tabela: engineering_items (projetos de engenharia)
CREATE TABLE public.engineering_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  wbs_id UUID REFERENCES public.budget_wbs(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  tipo eng_type NOT NULL DEFAULT 'FECHADO',
  labor_role_id UUID REFERENCES public.labor_roles(id) ON DELETE SET NULL,
  hh NUMERIC DEFAULT 0 CHECK (hh >= 0),
  valor NUMERIC DEFAULT 0 CHECK (valor >= 0),
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Tabela: budget_circuits (circuitos para dimensionamento)
CREATE TABLE public.budget_circuits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  wbs_id UUID REFERENCES public.budget_wbs(id) ON DELETE SET NULL,
  tag TEXT NOT NULL,
  tipo_partida TEXT,
  kw NUMERIC CHECK (kw >= 0),
  tensao_v NUMERIC CHECK (tensao_v >= 0),
  corrente_in_a NUMERIC CHECK (corrente_in_a >= 0),
  fatores_json JSONB DEFAULT '{}',
  saida_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Tabela: budget_generated_materials (materiais gerados por circuitos)
CREATE TABLE public.budget_generated_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  circuit_id UUID NOT NULL REFERENCES public.budget_circuits(id) ON DELETE CASCADE,
  material_codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  status gen_status NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Tabela: tax_rules (regras de impostos)
CREATE TABLE public.tax_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo tax_value_type NOT NULL DEFAULT 'PERCENT',
  valor NUMERIC NOT NULL DEFAULT 0,
  base tax_base NOT NULL DEFAULT 'SALE',
  aplica_em tax_scope NOT NULL DEFAULT 'ALL',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Tabela: markup_rules (regras de markup)
CREATE TABLE public.markup_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revision_id UUID NOT NULL UNIQUE REFERENCES public.budget_revisions(id) ON DELETE CASCADE,
  markup_pct NUMERIC NOT NULL DEFAULT 0 CHECK (markup_pct >= 0),
  allow_per_wbs BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TRIGGERS para cálculos automáticos
-- =====================================================

-- Trigger para labor_hh_allocations (calcular hh_total e custo_total)
CREATE OR REPLACE FUNCTION calculate_labor_allocation_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_custo_normal NUMERIC := 0;
  v_custo_he50 NUMERIC := 0;
  v_custo_he100 NUMERIC := 0;
BEGIN
  -- Buscar custos do snapshot
  SELECT custo_hora_normal, custo_hora_he50, custo_hora_he100
  INTO v_custo_normal, v_custo_he50, v_custo_he100
  FROM labor_cost_snapshot
  WHERE labor_role_id = NEW.labor_role_id AND revision_id = NEW.revision_id;
  
  -- Calcular totais
  NEW.hh_total := NEW.hh_normais + NEW.hh_50 + NEW.hh_100;
  NEW.custo_total := (NEW.hh_normais * COALESCE(v_custo_normal, 0)) + 
                     (NEW.hh_50 * COALESCE(v_custo_he50, 0)) + 
                     (NEW.hh_100 * COALESCE(v_custo_he100, 0));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_labor_allocation
  BEFORE INSERT OR UPDATE ON labor_hh_allocations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_labor_allocation_totals();

-- Trigger para mobilization_items
CREATE OR REPLACE FUNCTION calculate_mobilization_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.quantidade * NEW.valor_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_mobilization
  BEFORE INSERT OR UPDATE ON mobilization_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_mobilization_total();

-- Trigger para site_maintenance_items
CREATE OR REPLACE FUNCTION calculate_site_maintenance_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.valor_mensal * NEW.meses;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_site_maintenance
  BEFORE INSERT OR UPDATE ON site_maintenance_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_site_maintenance_total();

-- Trigger para equipment_rentals
CREATE OR REPLACE FUNCTION calculate_equipment_rental_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.quantidade * NEW.valor_mensal * NEW.meses;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_equipment_rental
  BEFORE INSERT OR UPDATE ON equipment_rentals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_equipment_rental_total();

-- Trigger para engineering_items
CREATE OR REPLACE FUNCTION calculate_engineering_total()
RETURNS TRIGGER AS $$
DECLARE
  v_custo_hora NUMERIC := 0;
BEGIN
  IF NEW.tipo = 'HH' AND NEW.labor_role_id IS NOT NULL THEN
    SELECT custo_hora_normal INTO v_custo_hora
    FROM labor_cost_snapshot
    WHERE labor_role_id = NEW.labor_role_id AND revision_id = NEW.revision_id;
    NEW.total := COALESCE(NEW.hh, 0) * COALESCE(v_custo_hora, 0);
  ELSE
    NEW.total := COALESCE(NEW.valor, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_engineering
  BEFORE INSERT OR UPDATE ON engineering_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_engineering_total();

-- Trigger para updated_at em labor_parameters
CREATE TRIGGER update_labor_parameters_updated_at
  BEFORE UPDATE ON labor_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em labor_cost_snapshot
CREATE TRIGGER update_labor_cost_snapshot_updated_at
  BEFORE UPDATE ON labor_cost_snapshot
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- labor_roles
ALTER TABLE public.labor_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver labor_roles"
  ON public.labor_roles FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar labor_roles"
  ON public.labor_roles FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- labor_parameters
ALTER TABLE public.labor_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver labor_parameters"
  ON public.labor_parameters FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar labor_parameters"
  ON public.labor_parameters FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- labor_cost_snapshot
ALTER TABLE public.labor_cost_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver labor_cost_snapshot"
  ON public.labor_cost_snapshot FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar labor_cost_snapshot"
  ON public.labor_cost_snapshot FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- labor_hh_allocations
ALTER TABLE public.labor_hh_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver labor_hh_allocations"
  ON public.labor_hh_allocations FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar labor_hh_allocations"
  ON public.labor_hh_allocations FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- mobilization_items
ALTER TABLE public.mobilization_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver mobilization_items"
  ON public.mobilization_items FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar mobilization_items"
  ON public.mobilization_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- site_maintenance_items
ALTER TABLE public.site_maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver site_maintenance_items"
  ON public.site_maintenance_items FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar site_maintenance_items"
  ON public.site_maintenance_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- equipment_rentals
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver equipment_rentals"
  ON public.equipment_rentals FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar equipment_rentals"
  ON public.equipment_rentals FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- engineering_items
ALTER TABLE public.engineering_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver engineering_items"
  ON public.engineering_items FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar engineering_items"
  ON public.engineering_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- budget_circuits
ALTER TABLE public.budget_circuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver budget_circuits"
  ON public.budget_circuits FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar budget_circuits"
  ON public.budget_circuits FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- budget_generated_materials
ALTER TABLE public.budget_generated_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver budget_generated_materials"
  ON public.budget_generated_materials FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar budget_generated_materials"
  ON public.budget_generated_materials FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- tax_rules
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver tax_rules"
  ON public.tax_rules FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar tax_rules"
  ON public.tax_rules FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));

-- markup_rules
ALTER TABLE public.markup_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver markup_rules"
  ON public.markup_rules FOR SELECT USING (true);

CREATE POLICY "Admin e financeiro podem gerenciar markup_rules"
  ON public.markup_rules FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin'));
