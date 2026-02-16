

# Persistir dados da Conciliacao no banco de dados

## Resumo

Salvar os dados parseados dos 3 arquivos (banco, Omie, cartao) no banco de dados para que, ao abrir a tela ou selecionar um periodo, os dados carreguem automaticamente sem reimportar.

## 1. Nova tabela: `conciliacao_imports`

Criar via migration:

```text
conciliacao_imports
  id              UUID PK
  tipo            TEXT ('extrato_banco' | 'extrato_omie' | 'fatura_cartao')
  periodo_ref     TEXT ('YYYY-MM')
  periodo_inicio  DATE (nullable)
  periodo_fim     DATE (nullable)
  status          TEXT DEFAULT 'ativo'
  nome_arquivo    TEXT
  total_lancamentos  INTEGER DEFAULT 0
  valor_total     NUMERIC(15,2) DEFAULT 0
  saldo_anterior  NUMERIC(15,2) (nullable)
  dados           JSONB (array de lancamentos parseados)
  metadata        JSONB (nullable, info extra como cartaoInfo)
  created_at      TIMESTAMPTZ DEFAULT NOW()
  updated_at      TIMESTAMPTZ DEFAULT NOW()
```

- Partial unique index: `(tipo, periodo_ref) WHERE status = 'ativo'` -- permite multiplos registros 'substituido'
- Index: `(periodo_ref, status)` para busca rapida
- RLS: authenticated users can manage (FOR ALL, USING true, WITH CHECK true)
- Trigger `update_updated_at_column` para manter updated_at atualizado

## 2. Novo hook: `src/hooks/useConciliacaoStorage.ts`

Funcoes:
- **saveImport(params)**: marca imports anteriores do mesmo tipo+periodo como 'substituido', insere novo como 'ativo'
- **loadImports(periodoRef)**: busca os 3 tipos ativos para o periodo, retorna `{ extratoBanco, extratoOmie, faturaCartao }`
- **deleteImport(tipo, periodoRef)**: marca como 'substituido'

O hook usa `supabase` client diretamente (sem react-query, operacoes pontuais).

## 3. Seletor de periodo na tela

Adicionar um seletor de mes/ano no header da pagina (ao lado do badge "Ref:"). O seletor:
- Mostra os ultimos 12 meses como opcoes
- Ao mudar, limpa os cards e resultado, e chama `loadImports()` para o novo periodo
- O periodo selecionado determina o `periodoRef` para salvar (nao mais extraido dos arquivos)

Componente: dois `<Select>` inline (mes + ano) ou um unico `<Select>` com opcoes tipo "Janeiro 2026", "Dezembro 2025", etc.

## 4. Alteracoes na pagina `src/pages/Conciliacao.tsx`

### Novo estado
- `periodoRef`: string no formato "YYYY-MM", inicializado com mes atual
- `loadingImports`: boolean para loading state ao carregar do banco
- `savedSources`: Record indicando quais cards vieram do banco (para mostrar badge "Salvo" vs "Carregado")

### Ao abrir / mudar periodo
1. Converter selecao para "YYYY-MM"
2. Chamar `loadImports(periodoRef)`
3. Se encontrar dados, preencher os cards automaticamente com dados do banco (criar `ParsedFileInfo` virtual com nome do arquivo salvo, rowCount, etc.)
4. Se nao encontrar, cards ficam vazios (upload normal)

### Ao importar arquivo (upload)
1. Parse normal (sem alterar parsers)
2. Apos parse bem-sucedido, chamar `saveImport()` com os dados parseados
3. Toast: "Extrato bancario salvo para Janeiro/2026"

### Ao remover (X)
1. Chamar `deleteImport(tipo, periodoRef)`
2. Limpar estado local do card
3. Toast: "Extrato bancario removido"

### Executar Conciliacao
- Quando dados vem do banco (sem File object), o `executarConciliacao` precisa aceitar arrays de dados diretamente em vez de File objects
- Criar uma funcao alternativa ou adaptar para aceitar dados ja parseados

### Badge visual
- Dados do upload manual: badge verde "Carregado" (como hoje)
- Dados do banco: badge azul "Salvo" com icone de banco de dados

## 5. Adaptacao do engine para aceitar dados pre-parseados

Criar uma funcao `executarConciliacaoFromData()` em `engine.ts` que aceita os arrays de lancamentos diretamente (em vez de File objects). A funcao `executarConciliacao` original continua funcionando para o fluxo de upload.

```text
executarConciliacaoFromData(
  banco: LancamentoBanco[],
  omie: LancamentoOmie[],
  cartaoTransacoes: TransacaoCartao[],
  cartaoInfo: CartaoInfo,
  saldoBanco: number | null,
  saldoOmie: number | null
): ResultadoConciliacao
```

A logica de matching/classificacao e extraida para ser compartilhada entre as duas funcoes.

## 6. Serializacao/deserializacao de datas

Os objetos `LancamentoBanco`, `LancamentoOmie` e `TransacaoCartao` contem campos `data: Date`. Ao salvar no JSONB, as datas viram strings ISO. Ao carregar, precisam ser reconstituidas como Date objects. O hook tera funcoes auxiliares para isso.

## Arquivos alterados

| Arquivo | O que muda |
|---|---|
| Migration SQL | Cria tabela `conciliacao_imports` com indexes e RLS |
| `src/hooks/useConciliacaoStorage.ts` | NOVO -- hook de persistencia |
| `src/pages/Conciliacao.tsx` | Seletor de periodo, auto-load, save on upload, badge visual |
| `src/lib/conciliacao/engine.ts` | Nova funcao `executarConciliacaoFromData()` |

## Arquivos NAO alterados

- parsers.ts, matcher.ts, classifier.ts, outputs.ts, types.ts
- Nenhum outro arquivo do projeto

