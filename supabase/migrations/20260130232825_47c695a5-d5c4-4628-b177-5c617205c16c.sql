-- ============================================
-- Migration: Remover restricoes de status no apontamento
-- ============================================

-- 1. Dropar trigger existente que bloqueia por status
DROP TRIGGER IF EXISTS trg_validar_limite_rateio_apontamento_item ON apontamento_item;

-- 2. Recriar funcao SEM validacao de status (apenas passa)
CREATE OR REPLACE FUNCTION public.validar_limite_rateio_apontamento_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  -- Funcao simplificada: apenas retorna NEW
  -- A validacao de horas >= 0 ja existe via constraint
  -- Removida toda logica de status e base do dia
  return new;
end $function$;

-- 3. Recriar trigger (agora nao bloqueia nada)
CREATE TRIGGER trg_validar_limite_rateio_apontamento_item
  BEFORE INSERT OR UPDATE ON apontamento_item
  FOR EACH ROW EXECUTE FUNCTION validar_limite_rateio_apontamento_item();

-- 4. Atualizar RLS policies para apontamento_item (remover restricao de status)
DROP POLICY IF EXISTS "apontamento_item_insert" ON apontamento_item;
DROP POLICY IF EXISTS "apontamento_item_update" ON apontamento_item;
DROP POLICY IF EXISTS "apontamento_item_delete" ON apontamento_item;

-- Nova policy INSERT sem restricao de status
CREATE POLICY "apontamento_item_insert" ON apontamento_item
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad
    WHERE ad.id = apontamento_dia_id
    AND (
      ad.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Nova policy UPDATE sem restricao de status
CREATE POLICY "apontamento_item_update" ON apontamento_item
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad
    WHERE ad.id = apontamento_dia_id
    AND (
      ad.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Nova policy DELETE sem restricao de status
CREATE POLICY "apontamento_item_delete" ON apontamento_item
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad
    WHERE ad.id = apontamento_dia_id
    AND (
      ad.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- 5. Atualizar RLS para apontamento_dia (UPDATE sem restricao de status)
DROP POLICY IF EXISTS "apontamento_dia_update" ON apontamento_dia;

CREATE POLICY "apontamento_dia_update" ON apontamento_dia
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 6. Normalizar dados existentes para RASCUNHO
UPDATE apontamento_dia 
SET status = 'RASCUNHO' 
WHERE status IN ('ENVIADO', 'APROVADO');