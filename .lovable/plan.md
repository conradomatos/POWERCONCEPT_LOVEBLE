

# Reestruturacao: Nova tela Cartao de Credito + Reorganizacao da Conciliacao

## Resumo

Separar responsabilidades em duas telas independentes:
- **Cartao de Credito** (`/financeiro/cartao-de-credito`): gerencia faturas, categoriza transacoes, gera planilha de importacao Omie
- **Conciliacao** (`/financeiro/conciliacao`): compara extrato bancario vs Omie (apenas 2 arquivos)

Ambas compartilham o mesmo backend (tabela `conciliacao_imports`) e reutilizam funcoes existentes sem duplicacao.

---

## Etapas de Implementacao

### 1. Corrigir erros de build pendentes

Antes de iniciar a reestruturacao, resolver os ~50 erros de TypeScript restantes (imports nao utilizados em `ProjetosCard`, `Cronograma`, `Histograma`, `MaoDeObra`, `CatalogoEquipamentos`, `CatalogoMaoDeObraFuncoesV2`, `IncidenciasMO`, `WbsTemplates`, `Documentos`, `Estrutura`, `Parametros`, `ResumoPrecos`, `VisaoGeral`, `OrcamentoDetail`, `Materiais`, `Admin`, `RentabilidadeProjeto`, etc). Sao majoritariamente remocoes de imports nao utilizados e conversoes de `null` para `undefined`.

### 2. Migrar banco de dados

Adicionar coluna `origem` a tabela `conciliacao_imports`:

```sql
ALTER TABLE conciliacao_imports 
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'upload';
```

### 3. Criar nova pagina `CartaoCredito.tsx`

**Arquivo:** `src/pages/financeiro/CartaoCredito.tsx`

Funcionalidades:
- Seletor de periodo (mesmo componente reutilizado da Conciliacao)
- Card de upload de fatura CSV do Sicredi
- Parse via `parseCartaoFromText` (importado de `src/lib/conciliacao/parsers.ts`)
- Categorizacao automatica via `suggestCategoria` (importado de `src/lib/conciliacao/categorias.ts`)
- Persistencia via `useConciliacaoStorage.saveImport()` com tipo `fatura_cartao`
- Auto-load ao abrir (carrega fatura salva do periodo)
- 6 cards de resumo: Total, Brasil, Exterior, Transacoes, Importaveis, Estornos
- 3 abas:
  - **Transacoes**: lista importaveis com busca/ordenacao
  - **Pagamentos/Estornos**: pagamentos de fatura e estornos
  - **Por Categoria**: agrupamento colapsavel com subtotais
- Botao "Gerar Importacao Omie" usando `gerarExcelImportacaoCartao` de `outputs.ts`
- Funciona independentemente da tela de Conciliacao

### 4. Registrar rota e navegacao

**Arquivo:** `src/App.tsx`
- Adicionar import de `CartaoCredito`
- Adicionar rota: `<Route path="/financeiro/cartao-de-credito" element={<CartaoCredito />} />`

**Arquivo:** `src/components/AppSidebar.tsx`
- Adicionar item "Cartao de Credito" com icone `CreditCard` entre "Conciliacao" e "Categorias"

**Arquivo:** `src/components/Layout.tsx`
- Adicionar `'/financeiro/cartao-de-credito': 'financeiro'` ao `routeToArea`

### 5. Reorganizar tela de Conciliacao

**Arquivo:** `src/pages/Conciliacao.tsx`

Remocoes:
- Card de upload "Fatura Cartao de Credito" (terceiro card)
- Estado `cartao` do `files` e `savedSources` (FileType passa a ser `'banco' | 'omie'`)
- Ref `cartaoRef`
- Bloco de parse de cartao no `handleFile`
- Card KPI "Cartao Importaveis" (quarto card)
- Botao "Importacao Cartao (.xlsx)" nos downloads
- Import de `CreditCard` do lucide

Alteracoes:
- Grid de cards: `md:grid-cols-3` para `md:grid-cols-2`
- Descricao do header: "Compare extrato bancario vs Omie para identificar divergencias"
- `cardConfigs` fica com 2 itens (banco + omie)
- KPIs ficam com 3 cards: Conciliados, Divergencias, Em Atraso

### 6. Reorganizar ResultTabs

**Arquivo:** `src/components/conciliacao/ResultTabs.tsx`

- Remover aba "Cartao p/ Importacao"
- Remover variaveis `cartaoImport`, `cartaoCols`, `cartaoTotal`
- Ficam 3 abas: Conciliados, Divergencias, Sem Match

### 7. Adaptar engine para cartao opcional

**Arquivo:** `src/lib/conciliacao/engine.ts`

- Parametros `cartaoTransacoes` e `cartaoInfo` passam a ser opcionais (com defaults vazios)
- Se `cartaoTransacoes` estiver vazio, nao executa `suggestCategoria` loop nem gera divergencias tipo I

**Arquivo:** `src/lib/conciliacao/classifier.ts`

- Remover bloco "I -- CARTAO PARA IMPORTAR" (linhas 168-183)
- O parametro `cartao` continua existindo na assinatura mas nao gera mais divergencias tipo I na conciliacao

### 8. Filtro por Conta Corrente (engine)

**Arquivo:** `src/lib/conciliacao/engine.ts`

Implementar auto-deteccao da conta corrente correspondente ao extrato bancario:
- Analisar campo `contaCorrente` dos lancamentos Omie
- Identificar a conta mais frequente que tenha matches com o banco
- Filtrar lancamentos Omie pela conta selecionada antes do matching
- Adicionar ao `ResultadoConciliacao`:
  - `contaCorrenteSelecionada: string`
  - `contasExcluidas: { nome: string; count: number }[]`
  - `totalOmieOriginal: number`
  - `totalOmieFiltrado: number`

**Arquivo:** `src/lib/conciliacao/types.ts`

Adicionar campos ao `ResultadoConciliacao`:
```typescript
contaCorrenteSelecionada?: string;
contasExcluidas?: { nome: string; count: number }[];
totalOmieOriginal?: number;
totalOmieFiltrado?: number;
```

**Arquivo:** `src/pages/Conciliacao.tsx`

Exibir info-box abaixo dos cards de upload mostrando:
- Conta selecionada e quantidade de lancamentos
- Contas excluidas com quantidades

---

## Detalhes Tecnicos

### Reutilizacao (sem duplicacao)

| Funcao | Arquivo original | Usado por |
|--------|-----------------|-----------|
| `parseCartaoFromText` | `src/lib/conciliacao/parsers.ts` | CartaoCredito.tsx |
| `suggestCategoria` | `src/lib/conciliacao/categorias.ts` | CartaoCredito.tsx |
| `gerarExcelImportacaoCartao` | `src/lib/conciliacao/outputs.ts` | CartaoCredito.tsx |
| `useConciliacaoStorage` | `src/hooks/useConciliacaoStorage.ts` | Ambas as telas |
| `csvToText`, `workbookToRows` | `src/lib/conciliacao/parsers.ts` | CartaoCredito.tsx |

### Funcao `gerarExcelImportacaoCartao` na tela do Cartao

A funcao atual recebe `ResultadoConciliacao`. Para funcionar independente, o botao na tela do Cartao montara um objeto parcial com apenas `cartaoTransacoes` e `cartaoInfo`, que sao os unicos campos que a funcao utiliza internamente.

### Arquivos modificados

| Arquivo | Acao |
|---------|------|
| ~15 arquivos com erros de build | Corrigir imports/tipos |
| `src/pages/financeiro/CartaoCredito.tsx` | Criar |
| `src/App.tsx` | Adicionar rota |
| `src/components/AppSidebar.tsx` | Adicionar item sidebar |
| `src/components/Layout.tsx` | Adicionar mapeamento de rota |
| `src/pages/Conciliacao.tsx` | Remover cartao, simplificar |
| `src/components/conciliacao/ResultTabs.tsx` | Remover aba cartao |
| `src/lib/conciliacao/engine.ts` | Cartao opcional + filtro conta |
| `src/lib/conciliacao/classifier.ts` | Remover divergencias tipo I |
| `src/lib/conciliacao/types.ts` | Adicionar campos multi-conta |
| Migracao SQL | Adicionar coluna `origem` |

### Arquivos NAO alterados

- `matcher.ts` -- matchers continuam iguais
- `parsers.ts` -- parsers continuam iguais (apenas importados pela nova pagina)
- `outputs.ts` -- funcao de geracao continua igual
- `utils.ts` -- utilitarios continuam iguais
- `categorias.ts` -- funcao de sugestao continua igual

