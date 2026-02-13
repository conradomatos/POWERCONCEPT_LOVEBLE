

# FASE 3.1 — Correções nos Downloads + Nova Aba "Financeiro"

## TAREFA 1: Correções no `outputs.ts`

Quatro correções pontuais no arquivo `src/lib/conciliacao/outputs.ts`:

### 1.1 Fornecedor fixo "CARTAO DE CREDITO" (linha 433)
Trocar `t.descricao.trim()` por `'CARTAO DE CREDITO'` na coluna C (Fornecedor) do Excel de importacao.

### 1.2 Juros, Multa, Desconto = 0 (linha 436)
Trocar as 3 strings vazias `''` nas posicoes de Juros/Multa/Desconto por `0`.

### 1.3 Observacoes com descricao original (linhas 429-430)
Mudar a construcao do campo `obs` para incluir `t.descricao` e usar separador `|`:
```
let obs = t.titular || '';
if (t.descricao) obs += ` | ${t.descricao.trim()}`;
if (t.parcela) obs += ` | ${t.parcela}`;
```

### 1.4 BOM UTF-8 no relatorio .md (linha 318)
Adicionar `'\uFEFF'` antes do conteudo na funcao `gerarRelatorioMD`:
```
const content = '\uFEFF' + lines.join('\n');
```

---

## TAREFA 2: Nova Aba "Financeiro"

### Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Layout.tsx` | Adicionar `'financeiro'` ao tipo `NavigationArea`, ao `routeToArea`, ao `topNavAreas`, e ao `firstRoutes` |
| `src/components/AppSidebar.tsx` | Adicionar area `financeiro` ao `areaNavItems` com item "Conciliacao" apontando para `/financeiro/conciliacao`. Remover "Conciliacao" da area `relatorios` |
| `src/App.tsx` | Trocar rota `/conciliacao` por `/financeiro/conciliacao`. Adicionar redirect `/conciliacao` -> `/financeiro/conciliacao` e `/financeiro` -> `/financeiro/conciliacao` |

### Detalhes tecnicos

**Layout.tsx**:
- Linha 23: Expandir tipo `NavigationArea` para incluir `'financeiro'`
- Linhas 47-50: Remover `/conciliacao: 'relatorios'` e adicionar `/financeiro: 'financeiro'` e `/financeiro/conciliacao: 'financeiro'`
- Linha 94: Adicionar `financeiro: '/financeiro/conciliacao'` ao `firstRoutes`
- Linha 105: Adicionar `{ id: 'financeiro', label: 'Financeiro', icon: Wallet }` ao array `topNavAreas` (importar `Wallet` do lucide-react)

**AppSidebar.tsx**:
- Linha 95: Remover o item `{ title: 'Conciliacao', url: '/conciliacao', icon: ArrowLeftRight }` da area `relatorios`
- Linha 101: Adicionar nova area `financeiro` com label "Financeiro" e item `{ title: 'Conciliacao', url: '/financeiro/conciliacao', icon: ArrowLeftRight }`

**App.tsx**:
- Linha 89: Trocar `<Route path="/conciliacao" ...>` por `<Route path="/financeiro/conciliacao" ...>`
- Adicionar redirect: `<Route path="/financeiro" element={<Navigate to="/financeiro/conciliacao" replace />} />`
- Adicionar redirect legado: `<Route path="/conciliacao" element={<Navigate to="/financeiro/conciliacao" replace />} />`

### Resultado visual

Menu principal (top bar):
```
[Recursos] [Projetos] [Orcamentos] [Relatorios] [Financeiro]
```

Sidebar quando "Financeiro" esta ativo:
```
Financeiro
  - Conciliacao (unico item por enquanto)
```

Sidebar de "Relatorios" (sem Conciliacao):
```
Relatorios
  - Dashboard
  - Rentabilidade
  - Custos & Margem
```

---

## Ordem de implementacao

1. Corrigir `outputs.ts` (4 alteracoes pontuais)
2. Atualizar `Layout.tsx` (tipo, rotas, top nav)
3. Atualizar `AppSidebar.tsx` (mover Conciliacao para financeiro)
4. Atualizar `App.tsx` (rotas + redirects)

