

# Persistir resultado da Conciliacao no Supabase

## Resumo

Criar tabela `conciliacao_resultados` para salvar o resultado completo da conciliacao, e integrar save/load/invalidate no hook e na pagina para que os resultados aparecam automaticamente ao abrir a tela.

## 1. Migration SQL

Criar tabela `conciliacao_resultados` com:
- `id`, `periodo_ref`, campos de totais (conciliados, divergencias, em_atraso, cartao_importaveis, camadas A-D)
- `resultado` JSONB com o objeto completo
- `status` (ativo/substituido) com validacao via trigger
- Unique partial index em `periodo_ref WHERE status = 'ativo'`
- RLS habilitado com policy para usuarios autenticados
- Trigger de validacao de status (mesmo padrao de `conciliacao_imports`)

```sql
CREATE TABLE conciliacao_resultados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_ref TEXT NOT NULL,
  total_conciliados INTEGER DEFAULT 0,
  total_divergencias INTEGER DEFAULT 0,
  total_em_atraso INTEGER DEFAULT 0,
  total_cartao_importaveis INTEGER DEFAULT 0,
  camada_a INTEGER DEFAULT 0,
  camada_b INTEGER DEFAULT 0,
  camada_c INTEGER DEFAULT 0,
  camada_d INTEGER DEFAULT 0,
  resultado JSONB NOT NULL,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_conciliacao_resultados_ativo
  ON conciliacao_resultados(periodo_ref)
  WHERE status = 'ativo';

ALTER TABLE conciliacao_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage conciliacao_resultados"
  ON conciliacao_resultados FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.validate_conciliacao_resultado_status()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('ativo', 'substituido') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be ativo or substituido', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_conciliacao_resultado_status
  BEFORE INSERT OR UPDATE ON conciliacao_resultados
  FOR EACH ROW EXECUTE FUNCTION validate_conciliacao_resultado_status();
```

## 2. Hook `useConciliacaoStorage` -- adicionar 3 funcoes

Adicionar ao hook existente:

**`saveResultado(periodoRef, resultado)`**
- Marca resultado anterior como 'substituido'
- Insere novo com totais extraidos do `ResultadoConciliacao` e o objeto completo no campo JSONB
- Usa `as any` para contornar tipos auto-gerados (mesmo padrao existente)

**`loadResultado(periodoRef)`**
- Query com `.maybeSingle()` (nao `.single()`)
- Retorna o registro ou null

**`invalidateResultado(periodoRef)`**
- Marca resultado ativo como 'substituido'

Retornar as 3 funcoes junto com as existentes.

## 3. Funcao de rehydrate para resultado

Adicionar `rehydrateResultado(data)` no hook que reconstroi as Dates nos arrays de matches, divergencias, banco e omieSicredi (mesma logica de `rehydrateDates` existente, aplicada recursivamente nos sub-arrays).

## 4. Pagina `Conciliacao.tsx` -- integrar

**No `useEffect` de load (ao mudar periodo):**
- Apos `loadImports`, chamar `loadResultado(periodoRef)`
- Se encontrar resultado salvo, rehydratar e setar em `setResultado`
- Se nao encontrar, manter null

**No `handleExecute`:**
- Apos concluir com sucesso e setar resultado, chamar `saveResultado`
- Toast adicional: "Conciliacao salva para {periodo}"

**No `handleFile` (upload de novo arquivo):**
- Apos salvar o import, chamar `invalidateResultado(periodoRef)`
- Setar `setResultado(null)`

**No `removeFile`:**
- Apos deletar import, chamar `invalidateResultado(periodoRef)`
- Ja faz `setResultado(null)` (manter)

## 5. Arquivos alterados

- `src/hooks/useConciliacaoStorage.ts` -- adicionar saveResultado, loadResultado, invalidateResultado, rehydrateResultado
- `src/pages/Conciliacao.tsx` -- integrar save/load/invalidate nos fluxos existentes

## 6. Arquivos NAO alterados

- engine.ts, matcher.ts, classifier.ts, parsers.ts, outputs.ts
- DataTable.tsx, ImportPreviewCard.tsx, ResultTabs.tsx
- Nenhum componente UI base

