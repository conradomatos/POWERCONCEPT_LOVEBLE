

# FASE 5 — Refinamento da Tela de Categorias

## Visao Geral

Tres melhorias na pagina `/financeiro/categorias`: Import/Export Excel, protecao contra exclusao com transferencia, e separacao visual Receitas vs Despesas.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/lib/conciliacao/categorias.ts` | MODIFICAR | Adicionar funcoes `exportarCategoriasXlsx()`, `importarCategoriasXlsx()`, `getCategoriaUsageCount()`, `transferirLancamentos()` |
| `src/pages/FinanceiroCategorias.tsx` | MODIFICAR | Separacao visual Receitas/Despesas, botoes Import/Export, dialog de importacao com preview, dialog de exclusao com transferencia |

---

## Detalhes Tecnicos

### 1. categorias.ts — Novas Funcoes

**`exportarCategoriasXlsx(storage: CategoriasStorage)`**
- Gera arquivo `categorias_contabeis_YYYY-MM-DD.xlsx` usando biblioteca `xlsx` (ja instalada)
- Colunas: Grupo, Tipo, Nome da Categoria, Conta do DRE, Tipo de Gasto, Keywords, Observacoes, Ativa
- Ordenar por grupo.ordem, depois categoria.ordem
- Keywords juntadas por virgula em celula unica
- Ativa = "Sim" / "Nao"
- Header com estilo bold e fundo cinza claro via `ws['!cols']` e cell styles
- Download automatico via `XLSX.writeFile()`

**`importarCategoriasXlsx(file: File): Promise<ImportPreview>`**
- Le arquivo .xlsx/.csv via `XLSX.read()`
- Retorna um objeto `ImportPreview` com:
  - `gruposEncontrados: number`
  - `categoriasEncontradas: number`
  - `novas: number` (nao existem no storage atual, match por nome case-insensitive)
  - `modificadas: number` (existem mas campos diferentes)
  - `semAlteracao: number`
  - `dados: { grupo, tipo, nome, contaDRE, tipoGasto, keywords, obs, ativa }[]` (dados parseados)
- Nao aplica mudancas — apenas retorna preview

**`aplicarImportacao(storage: CategoriasStorage, dados: ImportRow[]): CategoriasStorage`**
- Aplica as mudancas: cria grupos novos, cria/atualiza categorias
- Match por nome (case-insensitive, trim)
- Keywords: split por virgula, trim, uppercase
- Ativa: aceita "Sim", "sim", "S", "s", "true", "1" como true
- Se coluna Ativa vazia: considerar true
- Retorna novo CategoriasStorage para persistir

**`getCategoriaUsageCount(categoriaNome: string): number`**
- Verifica `localStorage.getItem('powerconcept_ultima_conciliacao')`
- Conta ocorrencias em `data.cartao` e `data.conciliados` onde `categoria` matches
- Retorna 0 se nao houver conciliacao salva

**`transferirLancamentos(categoriaOrigem: string, categoriaDestino: string): number`**
- Atualiza `powerconcept_ultima_conciliacao` no localStorage
- Substitui `categoria` em `cartao[]` e `conciliados[]`
- Retorna numero de lancamentos transferidos

### 2. FinanceiroCategorias.tsx — Mudancas na UI

**Novos estados:**
- `importDialog`: `{ open: boolean; preview: ImportPreview | null; file: File | null }`
- `transferDialog`: `{ open: boolean; catId: string; catNome: string; usageCount: number; targetCat: string }`
- `fileInputRef`: `useRef<HTMLInputElement>` (hidden file input)

**Header — Botoes Import/Export (linha 233):**
- Adicionar ao lado do botao "+ Grupo":
  - Botao "Importar" (icone `Upload`) — abre file input hidden
  - Botao "Exportar" (icone `Download`) — chama `exportarCategoriasXlsx(storage)`
  - Botao "+ Grupo" (existente)
- Hidden `<input type="file" accept=".xlsx,.csv" />` com ref

**Separacao Visual Receitas/Despesas (linhas 265-352):**
- Substituir o Accordion unico por duas secoes:
  - Secao RECEITAS: header com linha verde, icone `TrendingUp`, contadores
  - Secao DESPESAS: header com linha vermelha, icone `TrendingDown`, contadores
  - Separador `<div className="my-8" />` entre elas
- Cada secao tem seu proprio `<Accordion>` filtrando grupos por tipo
- Quando buscando, ambas as secoes mostram apenas grupos com resultados
- `openAccordions` continua sendo um unico array (IDs sao unicos entre grupos)

**Dialog de Importacao (novo):**
- Abre apos parsear arquivo
- Mostra: nome do arquivo, resumo (grupos, categorias novas/modificadas/inalteradas)
- Warning: "Esta acao substituira as categorias atuais"
- Botoes: Cancelar / Importar
- Ao confirmar: chama `aplicarImportacao()`, persiste, atualiza state, toast de sucesso

**Dialog de Exclusao com Transferencia (refatorar linhas 522-538):**
- Ao clicar excluir categoria:
  1. Chamar `getCategoriaUsageCount(nome)`
  2. Se count === 0: dialog simples de confirmacao (como atual)
  3. Se count > 0: dialog com aviso + dropdown para selecionar categoria destino + botao "Transferir e Excluir"
- Ao confirmar transferencia: chamar `transferirLancamentos()`, depois excluir categoria
- Grupo: manter logica atual (so exclui se vazio)

**Novos imports:**
- `TrendingUp`, `TrendingDown`, `Upload`, `Download` do lucide-react
- `exportarCategoriasXlsx`, `importarCategoriasXlsx`, `aplicarImportacao`, `getCategoriaUsageCount`, `transferirLancamentos` do categorias.ts
- `useRef` do React

---

## Ordem de Implementacao

1. Adicionar funcoes de export/import e usage/transfer em `categorias.ts`
2. Refatorar layout da pagina com separacao Receitas/Despesas
3. Adicionar botoes Import/Export no header
4. Adicionar dialog de importacao com preview
5. Refatorar dialog de exclusao para suportar transferencia

---

## O que NAO muda

- `types.ts` (modelo de dados ja correto)
- `parsers.ts`, `matcher.ts`, `classifier.ts`, `engine.ts`, `outputs.ts`
- `Conciliacao.tsx`
- Rotas, sidebar, Layout

