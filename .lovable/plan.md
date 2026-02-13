

# FASE 5 — Tela de Categorias Contábeis

## Visao Geral

Criar a tela de gestao de categorias contabeis em `/financeiro/categorias`, com estrutura hierarquica (grupos + categorias) persistida em localStorage, CRUD completo, e busca. A funcao `suggestCategoria` continua funcionando para o motor de conciliacao.

---

## Arquivos a Modificar/Criar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/lib/conciliacao/types.ts` | MODIFICAR | Adicionar interfaces `CategoriaGrupo`, `CategoriaItem`, `CategoriasStorage` e constante `CONTAS_DRE` |
| `src/lib/conciliacao/categorias.ts` | REESCREVER | Nova estrutura v2 com localStorage, seed de 13 grupos + 146 categorias, `suggestCategoria` compativel |
| `src/pages/FinanceiroCategorias.tsx` | CRIAR | Pagina completa com Accordion por grupo, CRUD grupo/categoria, busca, dialogs de edicao |
| `src/App.tsx` | MODIFICAR | Adicionar rota `/financeiro/categorias` (linha 89-91) |
| `src/components/AppSidebar.tsx` | MODIFICAR | Adicionar item "Categorias" com icone `Tags` na area `financeiro` (linha 100) |
| `src/components/Layout.tsx` | MODIFICAR | Adicionar `/financeiro/categorias: 'financeiro'` ao `routeToArea` (linha 53) |

---

## Detalhes Tecnicos

### 1. types.ts — Novos Tipos (apos linha 123)

```typescript
export interface CategoriaGrupo {
  id: string;
  nome: string;
  tipo: 'Receita' | 'Despesa';
  ordem: number;
  ativa: boolean;
}

export interface CategoriaItem {
  id: string;
  grupoId: string;
  nome: string;
  tipo: 'Receita' | 'Despesa';
  contaDRE: string;
  tipoGasto: string;
  keywords: string[];
  observacoes: string;
  ativa: boolean;
  ordem: number;
}

export interface CategoriasStorage {
  version: number;
  grupos: CategoriaGrupo[];
  categorias: CategoriaItem[];
  categoriaPadrao: string;
  contaCorrente: string;
}

export const CONTAS_DRE = [
  '(+) - Receita Bruta de Vendas',
  '(+) - Outras Receitas',
  '(+) - Recuperacao de Despesas Variaveis',
  '(-) - Deducoes de Receita',
  '(-) - Outras Deducoes de Receita',
  '(-) - Custo dos Servicos Prestados',
  '(-) - Outros Custos',
  '(-) - Despesas Variaveis',
  '(-) - Despesas com Pessoal',
  '(-) - Despesas Administrativas',
  '(-) - Despesas de Vendas e Marketing',
  '(-) - Despesas Financeiras',
  '(-) - Impostos',
  '(-) - Outros Tributos',
  '(-) - Ativos',
] as const;
```

### 2. categorias.ts — Reescrita Completa

- Chave localStorage: `powerconcept_categorias_v2`
- `loadCategoriasStorage()`: Le do localStorage, se nao existe faz seed com `getDefaultCategoriasStorage()`
- `saveCategoriasStorage(data)`: Grava no localStorage
- `suggestCategoria(descricao)`: Itera `storage.categorias` ativas, busca match em `keywords[]`, retorna `categoriaPadrao` se nao achar
- `getDefaultCategoriasStorage()`: Retorna os 13 grupos e 146 categorias com UUIDs gerados via `crypto.randomUUID()`
- Keywords pre-populadas apenas nas ~15 categorias do mapa `KEYWORDS_SEED` (COMBUSTIVEIS, ALIMENTACAO, MERCADO, etc.)
- Categorias com DRE "(pendente)" gravadas com `contaDRE: ''`
- Manter export de `CATEGORIAS_CONFIG` como wrapper de compatibilidade (para qualquer import existente)

### 3. FinanceiroCategorias.tsx — Pagina Principal

**Estado local:**
- `storage`: `CategoriasStorage` (carregado do localStorage)
- `searchTerm`: string de busca
- `editingGrupo`: grupo sendo editado (Dialog)
- `editingCategoria`: categoria sendo editada (Dialog)
- `openAccordions`: IDs dos accordions abertos

**Layout:**
- Header com titulo, contadores (receitas X grupos / Y cats, despesas, sem DRE)
- Input de busca que filtra por nome ou keyword
- Accordion com um item por grupo, ordenado por `ordem`
- Dentro de cada accordion: lista de Cards com nome, DRE badge, keywords badges
- Botoes de acao: editar/excluir em cada grupo e categoria
- Botao [+ Grupo] no topo, [+ Categoria] dentro de cada accordion
- Secao "Configuracoes" no rodape com dropdowns de categoria padrao e conta corrente

**Componentes usados:**
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `AlertDialog` para confirmacao de exclusao
- `Input`, `Select`, `Switch`, `Textarea`, `Badge`, `Button`, `Label`
- `ScrollArea` para lista longa

**Dialog de Edicao de Categoria:**
- Select: Grupo (dropdown com todos os grupos)
- Input: Nome (obrigatorio)
- Select: Conta DRE (dropdown com CONTAS_DRE + opcao vazia)
- Input: Tipo de gasto (texto livre)
- Keywords: Input com logica de chips (separar por Enter ou virgula, exibir como badges removiveis)
- Textarea: Observacoes
- Switch: Ativa

**Dialog de Grupo:**
- Input: Nome
- Select: Tipo (Receita/Despesa)

**Logica de busca:**
- Filtra categorias por `nome.includes(term)` ou alguma `keyword.includes(term)`
- Quando ativo, abre automaticamente os accordions que contém resultados

**Persistencia:**
- Toda mutacao (criar/editar/excluir grupo ou categoria) chama `saveCategoriasStorage()`
- Atualiza estado local imediatamente

### 4. Rota e Sidebar

**App.tsx** (apos linha 91):
```typescript
import FinanceiroCategorias from "./pages/FinanceiroCategorias";
// ...
<Route path="/financeiro/categorias" element={<FinanceiroCategorias />} />
```

**Layout.tsx** (linha 53):
```typescript
'/financeiro/categorias': 'financeiro',
```

**AppSidebar.tsx** (linha 100-101):
```typescript
import { Tags } from 'lucide-react';
// ...
financeiro: {
  label: 'Financeiro',
  items: [
    { title: 'Conciliacao', url: '/financeiro/conciliacao', icon: ArrowLeftRight },
    { title: 'Categorias', url: '/financeiro/categorias', icon: Tags },
  ],
},
```

---

## Seed: 13 Grupos e 146 Categorias

A funcao `getDefaultCategoriasStorage()` contera todos os dados reais do Omie conforme especificado no prompt. Cada grupo recebe um UUID e ordem sequencial (1-13). Cada categoria recebe UUID, referencia ao grupoId, nome, contaDRE (ou '' se pendente), tipoGasto vazio, e keywords do mapa KEYWORDS_SEED quando aplicavel.

---

## O que NAO muda

- `parsers.ts`, `matcher.ts`, `classifier.ts`, `engine.ts`, `utils.ts`, `outputs.ts`
- `Conciliacao.tsx` (consome `suggestCategoria` que continua compativel)
- Nenhuma outra pagina ou rota existente

