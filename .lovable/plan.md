

# Correcao: Remover Restricoes de Status no Apontamento

## Problema Identificado

O salvamento de apontamentos esta falhando devido a restricoes no banco de dados que bloqueiam edicoes quando o `apontamento_dia` tem status diferente de `'RASCUNHO'`.

### Componentes Bloqueadores Encontrados

| Componente | Tipo | Restricao |
|------------|------|-----------|
| `trg_validar_limite_rateio_apontamento_item` | Trigger | Bloqueia INSERT/UPDATE se `status != 'RASCUNHO'` |
| `apontamento_item_insert` | RLS Policy | Requer `status = 'RASCUNHO'` |
| `apontamento_item_update` | RLS Policy | Requer `status = 'RASCUNHO'` para usuario comum |
| `apontamento_item_delete` | RLS Policy | Requer `status = 'RASCUNHO'` para usuario comum |

### Dados Afetados

- 1 registro com `status = 'ENVIADO'`
- 1 registro com `status = 'APROVADO'`
- 6 registros com `status = 'RASCUNHO'` (funcionam normalmente)

---

## Solucao: Migration SQL

A migration devera:

1. **Remover o trigger** que bloqueia edicao por status
2. **Recriar a funcao** de validacao sem a checagem de status
3. **Atualizar RLS policies** para permitir edicao independente do status
4. **Normalizar dados** existentes para `'RASCUNHO'`

### Detalhes da Migration

```sql
-- 1. Dropar trigger existente
DROP TRIGGER IF EXISTS trg_validar_limite_rateio_apontamento_item 
  ON apontamento_item;

-- 2. Recriar funcao SEM validacao de status
--    (manter apenas validacao de limite de horas se necessario)
CREATE OR REPLACE FUNCTION validar_limite_rateio_apontamento_item()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  v_dia_id uuid;
begin
  v_dia_id := new.apontamento_dia_id;
  
  -- Apenas validar que horas >= 0 (ja tem constraint)
  -- Remover toda logica de status e base do dia
  
  return new;
end $function$;

-- 3. Recriar trigger apenas para recalcular totais (opcional)
CREATE TRIGGER trg_validar_limite_rateio_apontamento_item
  BEFORE INSERT OR UPDATE ON apontamento_item
  FOR EACH ROW EXECUTE FUNCTION validar_limite_rateio_apontamento_item();

-- 4. Atualizar RLS policies para apontamento_item
DROP POLICY IF EXISTS "apontamento_item_insert" ON apontamento_item;
DROP POLICY IF EXISTS "apontamento_item_update" ON apontamento_item;
DROP POLICY IF EXISTS "apontamento_item_delete" ON apontamento_item;

-- Policies permissivas (sem restricao de status)
CREATE POLICY "apontamento_item_insert" ON apontamento_item
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad
    WHERE ad.id = apontamento_item.apontamento_dia_id
    AND (
      ad.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

CREATE POLICY "apontamento_item_update" ON apontamento_item
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad
    WHERE ad.id = apontamento_item.apontamento_dia_id
    AND (
      ad.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

CREATE POLICY "apontamento_item_delete" ON apontamento_item
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM apontamento_dia ad
    WHERE ad.id = apontamento_item.apontamento_dia_id
    AND (
      ad.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- 5. Atualizar RLS para apontamento_dia (UPDATE)
DROP POLICY IF EXISTS "apontamento_dia_update" ON apontamento_dia;

CREATE POLICY "apontamento_dia_update" ON apontamento_dia
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 6. Normalizar dados existentes
UPDATE apontamento_dia 
SET status = 'RASCUNHO' 
WHERE status IN ('ENVIADO', 'APROVADO');
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| **Supabase Migration** | Nova migration SQL com as alteracoes acima |
| `src/hooks/useApontamentoSimplificado.ts` | Nenhuma alteracao necessaria (codigo ja esta correto) |

---

## Testes Apos Aplicar Migration

| Cenario | Resultado Esperado |
|---------|-------------------|
| Adicionar projeto a dia novo | Sucesso |
| Adicionar projeto a dia existente (antigo status ENVIADO) | Sucesso |
| Editar horas de item existente | Sucesso |
| Excluir item existente | Sucesso |
| Adicionar 2+ projetos e salvar | Todos persistem |

---

## Resumo Executivo

**Problema:** Trigger e RLS policies bloqueiam edicao quando `status != 'RASCUNHO'`

**Solucao:** 
1. Remover/simplificar trigger de validacao
2. Recriar policies sem restricao de status
3. Normalizar dados existentes

**Impacto:** Zero alteracoes no codigo frontend. Apenas migration no banco de dados.

