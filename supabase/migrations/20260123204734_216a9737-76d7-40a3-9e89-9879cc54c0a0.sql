
-- Fix search_path for all new functions
CREATE OR REPLACE FUNCTION calculate_labor_allocation_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_custo_normal NUMERIC := 0;
  v_custo_he50 NUMERIC := 0;
  v_custo_he100 NUMERIC := 0;
BEGIN
  SELECT custo_hora_normal, custo_hora_he50, custo_hora_he100
  INTO v_custo_normal, v_custo_he50, v_custo_he100
  FROM public.labor_cost_snapshot
  WHERE labor_role_id = NEW.labor_role_id AND revision_id = NEW.revision_id;
  
  NEW.hh_total := NEW.hh_normais + NEW.hh_50 + NEW.hh_100;
  NEW.custo_total := (NEW.hh_normais * COALESCE(v_custo_normal, 0)) + 
                     (NEW.hh_50 * COALESCE(v_custo_he50, 0)) + 
                     (NEW.hh_100 * COALESCE(v_custo_he100, 0));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_mobilization_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.quantidade * NEW.valor_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_site_maintenance_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.valor_mensal * NEW.meses;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_equipment_rental_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.quantidade * NEW.valor_mensal * NEW.meses;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_engineering_total()
RETURNS TRIGGER AS $$
DECLARE
  v_custo_hora NUMERIC := 0;
BEGIN
  IF NEW.tipo = 'HH' AND NEW.labor_role_id IS NOT NULL THEN
    SELECT custo_hora_normal INTO v_custo_hora
    FROM public.labor_cost_snapshot
    WHERE labor_role_id = NEW.labor_role_id AND revision_id = NEW.revision_id;
    NEW.total := COALESCE(NEW.hh, 0) * COALESCE(v_custo_hora, 0);
  ELSE
    NEW.total := COALESCE(NEW.valor, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
