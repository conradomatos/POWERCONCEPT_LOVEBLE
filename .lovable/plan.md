

# UX -- Visualizacao de dados e tabelas interativas na Conciliacao

## Resumo

Adicionar tabelas interativas para visualizar os dados importados (preview nos cards) e os resultados da conciliacao (abas navegaveis), sem alterar a logica de negocio.

## 1. Novo componente reutilizavel: `ConciliacaoDataTable`

Criar `src/components/conciliacao/DataTable.tsx` -- componente base para todas as tabelas da tela.

Funcionalidades:
- Campo de busca (filtra case-insensitive em todas as colunas)
- Ordenacao por coluna (click no header alterna ASC/DESC, seta visual)
- Paginacao interna: mostra 50 linhas, botao "Carregar mais"
- Rodape fixo com total e contador "Mostrando X de Y"
- Formatacao: valores em R$ (formato brasileiro), positivo verde, negativo vermelho, datas DD/MM/YYYY
- Scroll horizontal em telas menores, header sticky
- Usa os componentes Table/TableHeader/TableRow/etc existentes do shadcn

Props genericas:
- `columns`: array de definicoes (key, label, render, sortable, align)
- `data`: array de objetos
- `searchKeys`: quais campos buscar
- `totalLabel`/`totalValue`: para rodape
- `pageSize`: default 50

## 2. Cards de upload expandiveis

### Novo componente: `src/components/conciliacao/ImportPreviewCard.tsx`

Encapsula a logica do card atual + expansao com Collapsible do Radix (ja instalado).

Comportamento:
- Estado colapsado: identico ao card atual (nome, total, badge, botao X)
- Botao "Ver dados" (icone ChevronDown) ao lado do badge
- Ao expandir: mostra DataTable com os dados parseados abaixo do card info

Colunas por tipo:

**Extrato Bancario**: Data | Descricao | Valor | Saldo

**Extrato Omie**: Data | Descricao | Valor | Categoria | NF

**Fatura Cartao**: Data | Descricao | Valor | Categoria Mapeada

## 3. Abas de resultados da conciliacao

### Novo componente: `src/components/conciliacao/ResultTabs.tsx`

Usa Tabs do shadcn (ja instalado). Renderiza 4 abas apos executar conciliacao:

**Aba "Conciliados"** (usa `resultado.matches`)
- Colunas: # | Data Banco | Descricao Banco | Valor Banco | <-> | Data Omie | Descricao Omie | Valor Omie | Camada
- Cor de fundo por camada: A=verde, B=amarelo, C=laranja, D=vermelho (tons claros/sutis para dark theme)
- Valores com diferenca de centavos ficam destacados (bold/sublinhado)

**Aba "Divergencias"** (usa `resultado.divergencias`)
- Colunas: # | Origem | Data | Descricao | Valor | Tipo Divergencia
- Dropdown adicional para filtrar por tipo de divergencia
- Coluna "Origem" = fonte do item (Banco/Omie)

**Aba "Sem Match"** (derivado de `resultado.banco` e `resultado.omieSicredi` onde matched=false)
- Duas sub-secoes com headers: "No Banco mas nao no Omie" e "No Omie mas nao no Banco"
- Cada sub-secao usa DataTable

**Aba "Cartao p/ Importacao"** (derivado de `resultado.divergencias` tipo 'I')
- Colunas: # | Data | Descricao | Valor | Categoria | Cod. Integracao
- Total no rodape

### Contadores nas abas
Cada aba mostra o count no label: "Conciliados (360)", "Divergencias (226)", etc.

## 4. KPI cards clicaveis

Os 4 cards de resumo (Conciliados, Divergencias, Em Atraso, Cartao Importaveis) ganham `cursor-pointer` e `onClick` que seta a aba ativa correspondente + scroll suave ate o componente de abas.

## 5. Alteracoes em `src/pages/Conciliacao.tsx`

- Substituir renderizacao inline dos cards de upload por `ImportPreviewCard`
- Adicionar `ResultTabs` abaixo do resumo de matching, visivel quando `resultado` nao e null
- Novo estado `activeTab` para controlar aba ativa (vinculado aos KPI cards)
- Ref no container de abas para scroll automatico

## 6. Estrutura de arquivos

```text
src/components/conciliacao/
  DataTable.tsx           -- componente base reutilizavel
  ImportPreviewCard.tsx   -- card expandivel com preview
  ResultTabs.tsx          -- abas de resultados
```

## 7. Arquivos NAO alterados

- engine.ts, matcher.ts, classifier.ts, parsers.ts, outputs.ts
- useConciliacaoStorage.ts
- Nenhum componente UI base (table.tsx, tabs.tsx, etc.)
- Nenhuma migration SQL

## Detalhes tecnicos

### DataTable - logica de ordenacao
- Estado interno: `sortKey` e `sortDir` ('asc'|'desc')
- Click no header: se mesma coluna, inverte direcao; se outra, seta asc
- Ordenacao aplica sobre dados filtrados antes de paginar

### DataTable - logica de busca
- Estado interno `search`
- Filtra rows onde qualquer campo em `searchKeys` contem o texto (toLowerCase)
- Debounce de 200ms no input

### Formatacao de valores
- Funcao `formatBRL(v: number)` retorna string "R$ 1.234,56"
- Classe condicional: `text-green-500` se v > 0, `text-red-500` se v < 0

### Cor por camada (aba Conciliados)
- Camada A: `bg-green-500/10`
- Camada B: `bg-yellow-500/10`
- Camada C: `bg-orange-500/10`
- Camada D: `bg-red-500/10`

### Responsividade
- Container das tabelas com `overflow-x-auto`
- TableHeader com `sticky top-0` (ja configurado no table.tsx base)
- Em mobile, cards de upload empilham (ja funciona com grid-cols-1)

