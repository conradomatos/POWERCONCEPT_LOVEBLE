
# Corrigir DRE com valores incorretos + Mapeamento automático

## Resumo

Corrigir 3 problemas no pipeline de dados da DRE: (1) impostos retidos de AP indo erroneamente para Deducoes de Receita, (2) categorias nao mapeadas resultando em valores zerados, (3) AR e AP tratados sem distincao.

---

## Mudancas

### 1. Reescrever `src/hooks/useDREData.ts`

**Mudancas principais:**

- **Separar processamento AR vs AP** -- AR usa fallback "(+) - Receita Bruta de Vendas", AP usa fallback inteligente por prefixo
- **Impostos retidos** -- apenas de AR vao para "(-) - Deducoes de Receita"; impostos de AP sao ignorados (ja incluidos no valor do titulo)
- **Fallback por prefixo para AP:**
  - `2.01`/`2.02` -> Despesas com Pessoal
  - `2.03`/`2.04` -> Despesas Administrativas
  - `2.05` -> Despesas de Vendas e Marketing
  - `2.06` -> Despesas Administrativas
  - `3.x` -> Despesas Financeiras
  - Outros -> Despesas Administrativas
- **Novo retorno:** `{ dados: DREDadosMes[], unmapped: DREUnmappedInfo[] }` em vez de `DREDadosMes[]`
- **Interface `DREUnmappedInfo`:** `{ categoria, tipo: 'AR'|'AP', count, total }` para rastreamento
- **Tratar `categorias_rateio` como string JSON** -- o campo JSONB pode vir como string do Supabase, fazer `JSON.parse()` se necessario

### 2. Atualizar `src/pages/FinanceiroDRE.tsx`

**Adaptar ao novo retorno do hook:**

- `dreData` passa a ser `dreResult` com `{ dados, unmapped }`
- Onde usa `dreData` para `buildDREComDados` e `buildDREAnualComDados`, usar `dreResult?.dados`
- `hasDadosReais` baseado em `dreResult?.dados?.length > 0`
- Substituir alerta de "categorias orfas" (baseado em localStorage) por alerta de categorias nao mapeadas do Omie:
  - Se `dreResult?.unmapped?.length > 0`: "X categorias nao mapeadas -- usando classificacao automatica"
  - Exibir totais separados por AR e AP
  - Link para `/financeiro/mapeamento-categorias`
- Remover dependencia de `getCategoriasOrfas()` (que le localStorage)

### 3. Atualizar `src/pages/MapeamentoCategorias.tsx`

**Adicionar informacao de tipo AR/AP:**

- Novo hook `useMapeamentoTipos()` que consulta categorias distintas de ambas tabelas (AR e AP)
- Adicionar coluna "Tipo" na tabela com badge: verde "Receita" para categorias encontradas em AR, vermelho "Despesa" para AP, ambos se encontrado em ambos
- Atualizar funcao `handleAutoSuggest()` para usar tipo AR/AP na sugestao:
  - Se categoria aparece em AR -> sugerir "(+) - Receita Bruta de Vendas"
  - Se categoria aparece em AP -> usar fallback por prefixo (mesma logica do useDREData)

---

## Detalhes Tecnicos

### Parse de categorias_rateio

O campo `categorias_rateio` e JSONB no Supabase mas pode chegar como string no client. Adicionar logica:

```text
const rateio = typeof titulo.categorias_rateio === 'string' 
  ? JSON.parse(titulo.categorias_rateio) 
  : titulo.categorias_rateio;
```

### Fluxo de dados corrigido

```text
AR (Contas a Receber):
  - Com mapeamento -> conta DRE mapeada
  - Sem mapeamento -> "(+) - Receita Bruta de Vendas"
  - Impostos retidos -> "(-) - Deducoes de Receita"

AP (Contas a Pagar):
  - Com mapeamento -> conta DRE mapeada
  - Sem mapeamento -> fallback por prefixo do codigo Omie
  - Impostos retidos -> NAO processados separadamente
```

### Arquivos modificados

| Arquivo | Tipo de mudanca |
|---------|----------------|
| `src/hooks/useDREData.ts` | Reescrita completa da queryFn |
| `src/pages/FinanceiroDRE.tsx` | Adaptar ao novo retorno + substituir alerta de orfas |
| `src/pages/MapeamentoCategorias.tsx` | Adicionar coluna tipo AR/AP + melhorar sugestoes |

### Arquivos NAO alterados

- `src/lib/conciliacao/dre.ts` -- motor correto, recebe dados e calcula
- `supabase/functions/omie-financeiro/index.ts` -- Edge Function correta
- Tabelas SQL -- sem alteracao
