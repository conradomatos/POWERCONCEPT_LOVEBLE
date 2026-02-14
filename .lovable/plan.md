

# FIX-03 COMPLETO -- Mapeamento DRE + Expandir/Recolher + PDF

## Resumo

Seis alteracoes para corrigir o mapeamento de categorias DRE (custos zerados), fix do botao Expandir/Recolher, e melhorias no PDF.

## 1. Migration SQL -- Novas colunas na tabela omie_categoria_mapeamento

```text
ALTER TABLE omie_categoria_mapeamento ADD COLUMN IF NOT EXISTS conta_dre_omie TEXT;
ALTER TABLE omie_categoria_mapeamento ADD COLUMN IF NOT EXISTS tipo_categoria TEXT;
```

## 2. Edge Function: Nova etapa ListarCategorias

**Arquivo:** `supabase/functions/omie-financeiro/index.ts`

Inserir APOS o bloco existente de `ListarCadastroDRE` (linha ~354) e ANTES de `// Sync Contas a Receber` (linha ~356), um novo bloco que:

- Chama `https://app.omie.com.br/api/v1/geral/categorias/` com `call: "ListarCategorias"` paginado (500/pagina)
- Para cada categoria retornada, extrai `conta_despesa` ou `conta_receita` (nome da conta DRE real)
- Log do primeiro item para debug: `console.log("Sample category:", JSON.stringify(categorias[0]))`
- Acumula em `categoriaDreMap<codigo, {contaDre, tipo, descricao}>`
- Faz batch update na tabela `omie_categoria_mapeamento` setando `conta_dre_omie`, `tipo_categoria` e `descricao_omie`
- Delay de 200ms entre paginas
- Se falhar, loga erro e continua sync normalmente

## 3. Reescrever suggestContaDRE

**Arquivo:** `src/hooks/useCategoriaMapeamento.ts`

### 3A. Adicionar mapa OMIE_DRE_TO_POWERCONCEPT (antes da funcao)

Mapa de 22 entradas convertendo nomes de conta DRE do Omie para o formato usado na DRE do PowerConcept. Exemplos:
- `'Custo dos Serviços Prestados'` para `'(-) - Custo dos Serviços Prestados'`
- `'Receita Bruta de Vendas'` para `'(+) - Receita Bruta de Vendas'`
- `'Despesas Administrativas'` para `'(-) - Despesas Administrativas'`

### 3B. Reescrever suggestContaDRE com assinatura expandida

```text
export function suggestContaDRE(codigoOmie: string, contaDreOmie?: string | null): string | null
```

- PRIORIDADE 1: usar `contaDreOmie` para lookup exato no mapa, com fallback de match parcial
- PRIORIDADE 2: fallback por prefixo do codigo (mesma logica ja implementada no FIX-03 anterior)

### 3C. Atualizar interface CategoriaMapeamento

Adicionar campos `conta_dre_omie: string | null` e `tipo_categoria: string | null`.

## 4. Tela de Mapeamento: usar conta_dre_omie

**Arquivo:** `src/pages/MapeamentoCategorias.tsx`

### 4A. Atualizar handleAutoSuggest (linhas 120-153)

Substituir a logica atual de sugestao por:
- Importar `suggestContaDRE` de `useCategoriaMapeamento`
- Para cada categoria pendente, chamar `suggestContaDRE(m.codigo_omie, m.conta_dre_omie)`
- Remover a logica duplicada de fallback por prefixo e tipo AR/AP (agora esta dentro do suggestContaDRE)

### 4B. Adicionar coluna "DRE Omie" na tabela

- Novo `<TableHead>` apos "Tipo": `DRE Omie`
- Nova `<TableCell>` mostrando `m.conta_dre_omie || '---'` em texto pequeno
- Ajustar `colSpan` da row vazia de 6 para 7

## 5. Fix Expandir/Recolher na DRE

**Arquivo:** `src/pages/FinanceiroDRE.tsx`

### 5A. Estado (linha 486)

Substituir `const [expandAll, setExpandAll] = useState(false)` por:
```text
const [expandAllCounter, setExpandAllCounter] = useState(0);
const [expandAllState, setExpandAllState] = useState(false);
```

### 5B. Handlers (adicionados apos a declaracao de estado)

```text
const handleExpandAll = () => { setExpandAllState(true); setExpandAllCounter(c => c + 1); };
const handleCollapseAll = () => { setExpandAllState(false); setExpandAllCounter(c => c + 1); };
```

### 5C. Botoes (linhas 677-681)

- Expandir: `onClick={handleExpandAll}`
- Recolher: `onClick={handleCollapseAll}`

### 5D. Componentes filhos (linhas 749-761)

- DRESecaoBlockMensal: `key={secao.id + '-' + expandAllCounter}` e `expandAll={expandAllState}`
- DREAnualView: `key={expandAllCounter}` e `expandAll={expandAllState}`

### 5E. Componentes DRELinhaRow e AnualLinhaRow (linhas 57-66 e 378-389)

Alterar o useEffect para reagir corretamente:
```text
useEffect(() => {
  setLocalExpanded(expandAll);
}, [expandAll]);
```

E remover a logica `const expanded = expandAll || localExpanded` -- usar apenas `localExpanded`.

## 6. Melhorias no PDF

**Arquivo:** `src/lib/financeiro/exportDREPdf.ts`

O PDF ja implementa:
- Margens (MARGEM_MAP com Bruta, EBITDA, Liquida) -- linhas 84-87
- Valores negativos em vermelho (negativeIndices) -- linhas 242-245
- Acumulado na visao anual -- linha 96, coluna "Acum."

Nenhuma alteracao necessaria -- o FIX-02 ja cobriu tudo isso corretamente.

## O que NAO muda

- Estrutura da DRE (secoes, subtotais, calculos em `src/lib/conciliacao/dre.ts`)
- Layout geral das paginas
- Aliquotas de impostos (`src/lib/financeiro/aliquotas.ts`)
- Logica de sync de titulos AR/AP (FIX-01)
- Tabela `categorias_contabeis`
- Funcao `fallbackAP` e `useMapeamentoTipos` na MapeamentoCategorias (serao removidas pois a logica migra para suggestContaDRE)

