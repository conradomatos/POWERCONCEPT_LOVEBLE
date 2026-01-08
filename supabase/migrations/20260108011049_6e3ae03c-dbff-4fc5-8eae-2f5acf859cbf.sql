-- Step 1: Add beneficios column
ALTER TABLE public.custos_colaborador 
  ADD COLUMN IF NOT EXISTS beneficios numeric NOT NULL DEFAULT 0;

-- Step 2: Calculate beneficios from old columns
UPDATE public.custos_colaborador 
SET beneficios = COALESCE(vale_refeicao, 0) + COALESCE(vale_alimentacao, 0) + COALESCE(vale_transporte, 0) + COALESCE(ajuda_custo, 0) + COALESCE(plano_saude, 0);

-- Step 3: Update NULL values in other columns
UPDATE public.custos_colaborador SET classificacao = 'CLT' WHERE classificacao IS NULL;
UPDATE public.custos_colaborador SET fim_vigencia = '2099-12-31' WHERE fim_vigencia IS NULL;
UPDATE public.custos_colaborador SET motivo_alteracao = '' WHERE motivo_alteracao IS NULL;
UPDATE public.custos_colaborador SET observacao = '' WHERE observacao IS NULL;

-- Step 4: Drop old benefit columns
ALTER TABLE public.custos_colaborador 
  DROP COLUMN IF EXISTS vale_refeicao,
  DROP COLUMN IF EXISTS vale_alimentacao,
  DROP COLUMN IF EXISTS vale_transporte,
  DROP COLUMN IF EXISTS ajuda_custo,
  DROP COLUMN IF EXISTS plano_saude;

-- Step 5: Make columns NOT NULL with defaults
ALTER TABLE public.custos_colaborador 
  ALTER COLUMN classificacao SET NOT NULL,
  ALTER COLUMN classificacao SET DEFAULT 'CLT';

ALTER TABLE public.custos_colaborador 
  ALTER COLUMN fim_vigencia SET NOT NULL;

ALTER TABLE public.custos_colaborador 
  ALTER COLUMN motivo_alteracao SET NOT NULL,
  ALTER COLUMN motivo_alteracao SET DEFAULT '';

ALTER TABLE public.custos_colaborador 
  ALTER COLUMN observacao SET NOT NULL,
  ALTER COLUMN observacao SET DEFAULT '';

-- Step 6: Drop and recreate get_custo_vigente function
DROP FUNCTION IF EXISTS public.get_custo_vigente(uuid, date);

CREATE FUNCTION public.get_custo_vigente(p_colaborador_id uuid, p_data_referencia date DEFAULT CURRENT_DATE)
 RETURNS TABLE(
   id uuid, 
   colaborador_id uuid, 
   salario_base numeric, 
   periculosidade boolean, 
   beneficios numeric,
   classificacao text,
   inicio_vigencia date, 
   fim_vigencia date, 
   motivo_alteracao text, 
   observacao text,
   adicional_periculosidade numeric, 
   custo_mensal_total numeric, 
   custo_hora numeric
 )
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
    AND c.fim_vigencia >= p_data_referencia
  LIMIT 1;
$function$;

-- Step 7: Update validation trigger
CREATE OR REPLACE FUNCTION public.validate_custo_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fim_vigencia < NEW.inicio_vigencia THEN
    RAISE EXCEPTION 'fim_vigencia deve ser maior ou igual a inicio_vigencia';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.custos_colaborador
    WHERE colaborador_id = NEW.colaborador_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND inicio_vigencia <= NEW.fim_vigencia 
      AND fim_vigencia >= NEW.inicio_vigencia
  ) THEN
    RAISE EXCEPTION 'Já existe um registro de custo com vigência sobreposta para este colaborador';
  END IF;
  
  IF NEW.classificacao NOT IN ('CLT', 'PJ') THEN
    RAISE EXCEPTION 'Classificação deve ser CLT ou PJ';
  END IF;
  
  IF NEW.classificacao = 'PJ' THEN
    NEW.periculosidade := false;
    NEW.beneficios := 0;
  END IF;
  
  RETURN NEW;
END;
$function$;