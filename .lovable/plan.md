

# FASE 6 — Refinamento DRE (Documento Tecnico)

## Visao Geral

Transformar a tela DRE de um layout basico para um relatorio contabil profissional com: expand/collapse global, estrutura corrigida (sem Ativos), analise vertical (AV%), margens gerenciais, visao anual com 12 colunas, toggles AV%/AH%, e dialog de exportacao PDF.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/lib/conciliacao/types.ts` | MODIFICAR | Adicionar interface `DREAnual` |
| `src/lib/conciliacao/dre.ts` | MODIFICAR | Remover secao Ativos, remover duplicidade resultado, renomear secao Impostos, adicionar `buildDREAnual()` |
| `src/pages/FinanceiroDRE.tsx` | REESCREVER | Expand/collapse global, AV%, margens, visao mensal/anual, toggles, dialog PDF, KPIs corrigidos, tabela anual com scroll |

---

## Detalhes Tecnicos

### 1. types.ts — Adicionar DREAnual (apos linha 153)

```typescript
export interface DREAnual {
  ano: number;
  meses: DRERelatorio[];      // [0]=Jan ... [11]=Dez
  acumulado: DRERelatorio;    // Soma
}
```

Nenhuma outra mudanca em types.ts. A interface `DRELinha` ja tem `valor` e `categorias` — o AV% sera calculado na UI, nao armazenado no modelo.

### 2. dre.ts — Correcoes Estruturais

**Remover secao "INVESTIMENTOS E ATIVOS"** (linhas 83-90):
- Categorias com `contaDRE: '(-) - Ativos'` ficam de fora da DRE
- Serao tratadas no futuro (Balanco Patrimonial)

**Renomear secao IMPOSTOS** para "IMPOSTOS E CONTRIBUICOES"

**Ultimo subtotal**: Mudar de "RESULTADO LIQUIDO" para "RESULTADO LIQUIDO DO EXERCICIO" com tipo `'total'` em vez de `'subtotal'`

**Remover `resultado` duplicado** do return: O campo `resultado` do `DRERelatorio` passa a apontar para o subtotal da ultima secao (Impostos), eliminando a linha duplicada na UI

**Adicionar `buildDREAnual(ano: number): DREAnual`**:
- Chama `buildDREEstrutura` para cada mes (Jan-Dez do ano)
- Calcula `acumulado` somando valores (por enquanto tudo zero)
- Retorna `{ ano, meses: [...], acumulado }`

### 3. FinanceiroDRE.tsx — Reescrita Major

**Novos estados:**
```typescript
const [visao, setVisao] = useState<'mensal' | 'anual'>('mensal');
const [expandAll, setExpandAll] = useState(false);
const [showAV, setShowAV] = useState(true);
const [showAH, setShowAH] = useState(false);
const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
// PDF dialog options
const [pdfTipo, setPdfTipo] = useState<'sintetico' | 'analitico'>('analitico');
const [pdfVisao, setPdfVisao] = useState<'mensal' | 'anual'>('mensal');
const [pdfIncludeAV, setPdfIncludeAV] = useState(true);
const [pdfIncludeMargens, setPdfIncludeMargens] = useState(true);
const [pdfIncludeAH, setPdfIncludeAH] = useState(false);
```

**Toolbar (periodo + controles):**
- Periodo: Select mes + Select ano (existente)
- Visao: Toggle `Mensal | Anual` (dois botoes ou Tabs)
- Toggles: `AV%` (default ON), `AH%` (default OFF, disabled quando mensal)
- Botoes: `Expandir tudo`, `Recolher tudo`
- Botao: `Exportar PDF` (abre dialog)
- No modo anual, mes selector fica desabilitado

**Componente DRELinhaRow refatorado:**
- Recebe `expandAll: boolean` — se true, forca expansao
- Recebe `showAV: boolean` e `receitaLiquida: number` para coluna AV%
- Layout com 3 colunas: nome | valor (w-32 text-right) | AV% (w-16 text-right, condicional)
- AV% = `(valor / receitaLiquida * 100).toFixed(1)%` ou `—` se receita = 0

**Componente DRESubtotalRow refatorado:**
- Recebe `showAV`, `receitaLiquida`
- Mostra AV% na mesma coluna
- Linha de margem abaixo dos subtotais relevantes (Lucro Bruto, EBITDA, Resultado Liquido)
- Margem: texto xs italic muted, cor verde/vermelho conforme sinal

**Visao Mensal:**
- Header de colunas discreto: `Valor` e `AV%` (text-xs muted)
- Corpo do DRE como atual mas com AV% e expand/collapse global
- Resultado final como ultima linha da ultima secao (sem duplicidade)

**Visao Anual:**
- Tabela com scroll horizontal via `<ScrollArea>`
- Coluna fixa esquerda: nome da conta (sticky, min-w-[250px])
- 12 colunas de meses: Jan-Dez (min-w-[80px] cada)
- Coluna ACUM. (acumulado, sticky right se possivel, senao normal)
- Coluna AV% (sobre acumulado, condicional ao toggle)
- Valores abreviados: `formatAbrev(valor)` — ex: 12.5k, 1.2M — tooltip com valor completo
- AH%: Quando toggle ON, cada celula de mes mostra variacao vs mes anterior em texto menor abaixo do valor
  - `(+20%)` verde, `(-15%)` vermelho
  - Para despesas: logica inversa (aumento = vermelho)
  - Primeiro mes (Jan): sem variacao (`—`)
- Drill-down: No modo anual, clicar na linha expande as categorias abaixo mostrando uma sub-linha por categoria com os 12 valores
- Margens: Aparecem como linhas extras apos subtotais relevantes

**KPIs corrigidos (4 cards):**

| Card | Valor | Margem abaixo | Cor |
|------|-------|---------------|-----|
| Receita Liquida | Receita Bruta - Deducoes | `100% s/RB` | emerald |
| Custos Totais | CSP + Outros Custos | `% s/RL` | red |
| EBITDA | Resultado Operacional | `Margem EBITDA %` | condicional |
| Resultado Liquido | Resultado final | `Margem Liquida %` | condicional |

No modo anual: KPIs mostram acumulado do ano.

**Dialog Exportar PDF:**
- Radio: Sintetico / Analitico
- Radio: Mensal / Anual
- Checkboxes: AV%, Margens, AH% (AH% disabled se mensal)
- Periodo exibido
- Botao "Exportar PDF": mostra toast "Exportacao disponivel apos importar dados financeiros."
- Usa `Dialog`, `RadioGroup`, `Checkbox`, `Button`

**Novos imports necessarios:**
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` 
- `RadioGroup, RadioGroupItem`
- `Checkbox`
- `ScrollArea`
- `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger`
- `Maximize2, Minimize2` (icones expand/collapse) do lucide-react
- `Tabs, TabsList, TabsTrigger` (toggle mensal/anual)

---

## Funcao helper para valores abreviados (modo anual)

```typescript
function formatAbrev(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(valor / 1_000).toFixed(1)}k`;
  return valor.toFixed(0);
}
```

---

## Ordem de Implementacao

1. Adicionar `DREAnual` em types.ts
2. Corrigir estrutura em dre.ts (remover Ativos, renomear, adicionar buildDREAnual)
3. Reescrever FinanceiroDRE.tsx com todos os novos recursos

---

## O que NAO muda

- `categorias.ts` — sem mudancas
- `FinanceiroCategorias.tsx` — sem mudancas
- `parsers.ts`, `matcher.ts`, `classifier.ts`, `engine.ts`, `outputs.ts`
- `Conciliacao.tsx`
- Rotas e sidebar (ja configurados)

