-- Função para obter custo vigente com cálculo completo de encargos CLT
CREATE OR REPLACE FUNCTION public.obter_custo_vigente(
  p_colaborador_id uuid,
  p_data date,
  p_horas_normais numeric DEFAULT 0,
  p_horas_50 numeric DEFAULT 0,
  p_horas_100 numeric DEFAULT 0
)
RETURNS TABLE(
  custo_id uuid,
  colaborador_id uuid,
  classificacao text,
  salario_base numeric,
  periculosidade_valor numeric,
  beneficios numeric,
  salario_t numeric,
  fgts_t numeric,
  encargos numeric,
  prov_ferias numeric,
  prov_13 numeric,
  prov_rescisao numeric,
  provisoes_t numeric,
  custo_mensal_total numeric,
  horas_totais numeric,
  custo_hora_homem numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_custo RECORD;
  v_encargos RECORD;
  v_salario_t numeric;
  v_fgts_t numeric;
  v_encargos_val numeric;
  v_prov_ferias numeric;
  v_prov_13 numeric;
  v_prov_rescisao numeric;
  v_provisoes_t numeric;
  v_custo_total numeric;
  v_horas_totais numeric;
  v_custo_hora numeric;
  v_periculosidade_valor numeric;
BEGIN
  -- Buscar custo vigente pela data (mais recente com inicio_vigencia <= data)
  SELECT * INTO v_custo
  FROM public.custos_colaborador c
  WHERE c.colaborador_id = p_colaborador_id
    AND c.inicio_vigencia <= p_data
    AND (c.fim_vigencia IS NULL OR c.fim_vigencia >= p_data)
  ORDER BY c.inicio_vigencia DESC
  LIMIT 1;
  
  -- Se não encontrou, retorna vazio
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Buscar modelo de encargos (assume apenas um registro)
  SELECT * INTO v_encargos
  FROM public.encargos_modelo_clt
  LIMIT 1;
  
  -- Se não há modelo de encargos, usa zeros
  IF NOT FOUND THEN
    v_encargos.inss := 0;
    v_encargos.inss_a := 0;
    v_encargos.salario_educacao := 0;
    v_encargos.fgts := 0;
    v_encargos.fgts_a := 0;
    v_encargos.ratsat := 0;
    v_encargos.provisao_ferias := 0;
    v_encargos.provisao_13 := 0;
    v_encargos.fator_rescisao_fgts := 0;
  END IF;
  
  -- Calcular periculosidade (30% do salário base, apenas para CLT com flag true)
  IF v_custo.classificacao = 'CLT' AND v_custo.periculosidade THEN
    v_periculosidade_valor := v_custo.salario_base * 0.30;
  ELSE
    v_periculosidade_valor := 0;
  END IF;
  
  -- Calcular salário total
  IF v_custo.classificacao = 'PJ' THEN
    -- PJ: apenas o valor contratado, sem encargos
    v_salario_t := v_custo.salario_base;
    v_fgts_t := 0;
    v_encargos_val := 0;
    v_prov_ferias := 0;
    v_prov_13 := 0;
    v_prov_rescisao := 0;
    v_provisoes_t := 0;
    v_custo_total := v_salario_t;
  ELSE
    -- CLT: cálculo completo
    v_salario_t := v_custo.salario_base + v_periculosidade_valor + v_custo.beneficios;
    
    -- FGTS total
    v_fgts_t := v_salario_t * (v_encargos.fgts + v_encargos.fgts_a);
    
    -- Encargos diretos
    v_encargos_val := v_salario_t * (
      v_encargos.inss + 
      v_encargos.inss_a + 
      v_encargos.salario_educacao + 
      v_encargos.fgts + 
      v_encargos.fgts_a + 
      v_encargos.ratsat
    );
    
    -- Provisões
    v_prov_ferias := v_salario_t * v_encargos.provisao_ferias;
    v_prov_13 := v_salario_t * v_encargos.provisao_13;
    v_prov_rescisao := v_fgts_t * v_encargos.fator_rescisao_fgts;
    v_provisoes_t := v_prov_ferias + v_prov_13 + v_prov_rescisao;
    
    -- Custo total mensal
    v_custo_total := v_salario_t + v_encargos_val + v_provisoes_t;
  END IF;
  
  -- Calcular horas totais (normais + 50% + 100%)
  v_horas_totais := COALESCE(p_horas_normais, 0) + COALESCE(p_horas_50, 0) + COALESCE(p_horas_100, 0);
  
  -- Custo hora homem (proteção contra divisão por zero)
  -- Usa 220 horas mensais padrão para calcular o custo hora base
  IF v_horas_totais > 0 THEN
    v_custo_hora := ROUND(v_custo_total / 220, 2);
  ELSE
    v_custo_hora := ROUND(v_custo_total / 220, 2);
  END IF;
  
  -- Retornar resultado
  RETURN QUERY SELECT
    v_custo.id,
    v_custo.colaborador_id,
    v_custo.classificacao,
    v_custo.salario_base,
    v_periculosidade_valor,
    v_custo.beneficios,
    v_salario_t,
    v_fgts_t,
    v_encargos_val,
    v_prov_ferias,
    v_prov_13,
    v_prov_rescisao,
    v_provisoes_t,
    v_custo_total,
    v_horas_totais,
    v_custo_hora;
END;
$function$;