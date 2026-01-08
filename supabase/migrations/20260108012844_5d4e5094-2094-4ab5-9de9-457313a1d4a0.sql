-- 1) Make fim_vigencia nullable
ALTER TABLE public.custos_colaborador ALTER COLUMN fim_vigencia DROP NOT NULL;

-- 2) Update the validation trigger to handle nullable fim_vigencia
CREATE OR REPLACE FUNCTION public.validate_custo_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate fim_vigencia if provided
  IF NEW.fim_vigencia IS NOT NULL AND NEW.fim_vigencia < NEW.inicio_vigencia THEN
    RAISE EXCEPTION 'fim_vigencia deve ser maior ou igual a inicio_vigencia';
  END IF;
  
  -- Check for overlapping dates
  -- A record with NULL fim_vigencia is considered open-ended (ongoing)
  IF EXISTS (
    SELECT 1 FROM public.custos_colaborador
    WHERE colaborador_id = NEW.colaborador_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- Case 1: Both have fim_vigencia - check standard overlap
        (fim_vigencia IS NOT NULL AND NEW.fim_vigencia IS NOT NULL AND
         inicio_vigencia <= NEW.fim_vigencia AND fim_vigencia >= NEW.inicio_vigencia)
        OR
        -- Case 2: Existing is open (NULL fim), new has fim - check if new starts before existing ends (never)
        (fim_vigencia IS NULL AND NEW.fim_vigencia IS NOT NULL AND
         inicio_vigencia <= NEW.fim_vigencia)
        OR
        -- Case 3: Existing has fim, new is open - check if existing extends into new
        (fim_vigencia IS NOT NULL AND NEW.fim_vigencia IS NULL AND
         fim_vigencia >= NEW.inicio_vigencia)
        OR
        -- Case 4: Both are open - always overlap (not allowed)
        (fim_vigencia IS NULL AND NEW.fim_vigencia IS NULL)
      )
  ) THEN
    RAISE EXCEPTION 'Já existe um registro de custo com vigência sobreposta para este colaborador';
  END IF;
  
  -- Validate classificacao
  IF NEW.classificacao NOT IN ('CLT', 'PJ') THEN
    RAISE EXCEPTION 'Classificação deve ser CLT ou PJ';
  END IF;
  
  -- PJ: force periculosidade = false and beneficios = 0
  IF NEW.classificacao = 'PJ' THEN
    NEW.periculosidade := false;
    NEW.beneficios := 0;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3) Update get_custo_vigente function to handle nullable fim_vigencia
CREATE OR REPLACE FUNCTION public.get_custo_vigente(p_colaborador_id uuid, p_data_referencia date DEFAULT CURRENT_DATE)
 RETURNS TABLE(id uuid, colaborador_id uuid, salario_base numeric, periculosidade boolean, beneficios numeric, classificacao text, inicio_vigencia date, fim_vigencia date, motivo_alteracao text, observacao text, adicional_periculosidade numeric, custo_mensal_total numeric, custo_hora numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    c.id,
    c.colaborador_id,
    c.salario_base,
    c.periculosidade,
    c.beneficios,
    c.classificacao,
    c.inicio_vigencia,
    c.fim_vigencia,
    c.motivo_alteracao,
    c.observacao,
    CASE 
      WHEN c.classificacao = 'PJ' THEN 0::numeric
      WHEN c.periculosidade THEN c.salario_base * 0.30 
      ELSE 0::numeric 
    END as adicional_periculosidade,
    CASE 
      WHEN c.classificacao = 'PJ' THEN c.salario_base
      ELSE c.salario_base + 
           CASE WHEN c.periculosidade THEN c.salario_base * 0.30 ELSE 0 END + 
           c.beneficios
    END as custo_mensal_total,
    ROUND(
      CASE 
        WHEN c.classificacao = 'PJ' THEN c.salario_base
        ELSE c.salario_base + 
             CASE WHEN c.periculosidade THEN c.salario_base * 0.30 ELSE 0 END + 
             c.beneficios
      END / 220, 2
    ) as custo_hora
  FROM public.custos_colaborador c
  WHERE c.colaborador_id = p_colaborador_id
    AND c.inicio_vigencia <= p_data_referencia
    AND (c.fim_vigencia IS NULL OR c.fim_vigencia >= p_data_referencia)
  LIMIT 1;
$function$;