
# Melhorias no Motor de Conciliacao e Relatorio PDF (v2)

## Resumo

Seis melhorias no motor de conciliacao baseadas na analise real do relatorio Jan/2026: filtrar valores zero, detectar lancamentos na conta errada (tipo F), melhorar agrupamento de CT-e/fretes, sinalizar NF-e parceladas, melhorar layout do PDF, e adicionar tipo F ao sistema de cores/labels.

---

## Etapas de Implementacao

### 1. Atualizar tipos (`src/lib/conciliacao/types.ts`)

Adicionar ao `Divergencia`:
- Campo `confianca?: 'alta' | 'media' | 'baixa'`

Adicionar ao `ResultadoConciliacao`:
- Campo `lancamentosZerados: { banco: number; omie: number; total: number }`

O campo `tipo` no `Divergencia` ja e `string`, entao o tipo 'F' funciona sem alteracao no union.

### 2. Filtrar valor zero no engine (`src/lib/conciliacao/engine.ts`)

Em `executarMatchingEClassificacao`, ANTES de chamar `filtrarPorContaCorrente`:
- Filtrar lancamentos com `Math.abs(valor) < 0.01` de banco e omie
- Contar zerados de cada fonte
- Incluir `lancamentosZerados` no resultado retornado

Em `executarConciliacaoFromData`, aplicar o mesmo filtro apos o reset de flags.

Em `executarConciliacao`, aplicar apos o parse dos arquivos.

### 3. Expandir `contasExcluidas` no engine para incluir entradas

Atualmente `contasExcluidas` so tem `{ nome, count }`. Para a deteccao de tipo F, o classifier precisa das entradas reais da conta do cartao.

Alterar `filtrarPorContaCorrente` para retornar tambem as entradas de cada conta excluida:
```
contasExcluidas: { nome: string; count: number; entradas: LancamentoOmie[] }[]
```

Atualizar `ResultadoConciliacao` em `types.ts` para refletir essa mudanca.

Passar `contasExcluidas` para `classifyDivergencias` como parametro adicional.

### 4. Agrupamento CT-e no matcher (`src/lib/conciliacao/matcher.ts`)

Na funcao `matchCamadaC`, APOS os blocos existentes de agrupamento, adicionar:
- Bloco de agrupamento para CT-e/fretes com janela de 45 dias
- Primeiro tenta soma total de todos os CT-es do mesmo CNPJ
- Se nao bater, tenta subconjuntos por quinzena (dias 1-15 e 16-31)
- Usa `markMatch` com camada 'C' e tipo `CT-e_Agrupamento` ou `CT-e_Quinzena`

### 5. Novas classificacoes no classifier (`src/lib/conciliacao/classifier.ts`)

Atualizar assinatura de `classifyDivergencias` para receber `contasExcluidas`.

**5a. Tipo F -- Possivel conta errada (cartao no banco)**

Apos o bloco de tipo B, adicionar deteccao:
- Metodo 1 (alta confianca): cruzar valor com entradas da conta de cartao excluida
- Metodo 2 (media confianca): heuristica -- obs contem "RECEBIMENTO DA NF" + valor < R$500 + saida
- Reclassifica de B para F, define `confianca`, `tipoNome` e `acao`

**5b. Acao melhorada para CT-e tipo B**

Apos classificacao, percorrer divergencias tipo B e melhorar acao quando obs contem "CT-E" ou "RECEBIMENTO DO CT".

**5c. Acao melhorada para NF-e parcelada tipo B**

Para tipo B com obs contendo "RECEBIMENTO DA NF" + valor > R$400 + saida, definir acao especifica sobre verificar parcelamento.

### 6. Atualizar chamada no engine (`src/lib/conciliacao/engine.ts`)

Passar `filtro.contasExcluidas` para `classifyDivergencias`:
```typescript
classifyDivergencias(banco, omieFiltrado, cartaoTransacoes, divergencias, matches, filtro.contasExcluidas);
```

### 7. Melhorar relatorio PDF (`src/lib/conciliacao/outputs.ts`)

**7a. Funcao `descricaoLegivel`**: nova funcao auxiliar que prioriza nome do fornecedor (`clienteFornecedor` ou `razaoSocial`) sobre obs/descricao bruta. Fallback limpa prefixos como "LIQUIDACAO BOLETO", "PAGAMENTO PIX".

**7b. Tabelas de divergencia no PDF**: trocar colunas de `['#', 'Data', 'Valor', 'Descricao', 'CNPJ/CPF', 'Acao']` para `['#', 'Data', 'Valor', 'Fornecedor', 'Categoria', 'Acao']`. Usar `descricaoLegivel()` para Fornecedor. Categoria vem de `d.omie?.categoria`.

**7c. Ajustar larguras de coluna**: `#(8)`, `Data(20)`, `Valor(25, right)`, `Fornecedor(45)`, `Categoria(35)`, `Acao(47)`.

**7d. Tipo F no tipoConfig**: adicionar `['F', 'Tipo F -- Possivel Conta Errada', [255, 235, 238]]` apos tipo A e antes de tipo B.

**7e. Omitir secao Cartao vazia**: condicionar secao 3 (Cartao de Credito) a `r.cartaoTransacoes?.length > 0` em vez de apenas `r.cartaoInfo`.

**7f. Checklist sem cartao zero**: so mostrar item CARTAO no checklist se `validImportCheck.length > 0` (ja existe, mas garantir que a secao 3 do cartao tambem respeita).

**7g. KPIs no PDF**: remover card "Cartao Import." (quarto KPI). Ficam 3 cards: Conciliados, Divergencias, Em Atraso. Ajustar largura dos cards para 3 colunas.

**7h. Banner de zerados**: apos KPIs, se `lancamentosZerados.total > 0`, adicionar linha de texto informando quantos lancamentos zerados foram ignorados.

### 8. Melhorar relatorio Markdown (`src/lib/conciliacao/outputs.ts`)

- Tipo F nas tabelas de divergencia do MD
- Omitir secao Cartao se nao houver transacoes
- Checklist sem cartao zero
- Adicionar banner de zerados

### 9. Excel de divergencias (`src/lib/conciliacao/outputs.ts`)

- Adicionar 'F': 'POSSIVEL CONTA ERRADA' ao `tipoDescricoes`

### 10. Atualizar UI da tela de Conciliacao (`src/pages/Conciliacao.tsx`)

- Adicionar banner informativo sobre lancamentos zerados (abaixo do info-box de conta corrente)
- Condicao: `resultado.lancamentosZerados?.total > 0`

### 11. Tipo F na aba Divergencias (`src/components/conciliacao/ResultTabs.tsx`)

O tipo F ja aparece automaticamente na aba Divergencias pois usa `tipoNome` dinamico. Adicionar badge visual:
- Na coluna `tipoNome`, detectar tipo F e renderizar com cor rosa/vermelho claro
- Se `confianca === 'alta'`, badge solido. Se `media`, badge outline.

---

## Detalhes Tecnicos

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/conciliacao/types.ts` | Adicionar `confianca` em Divergencia, `lancamentosZerados` em ResultadoConciliacao, expandir `contasExcluidas` com entradas |
| `src/lib/conciliacao/engine.ts` | Filtrar zeros, passar contasExcluidas para classifier |
| `src/lib/conciliacao/matcher.ts` | Bloco CT-e quinzenal na Camada C |
| `src/lib/conciliacao/classifier.ts` | Tipo F (2 metodos), acao CT-e, acao NF-e parcelada |
| `src/lib/conciliacao/outputs.ts` | PDF: descricaoLegivel, colunas Fornecedor+Categoria, tipo F, omitir cartao vazio, banner zerados. MD: mesmas melhorias. Excel: tipo F |
| `src/pages/Conciliacao.tsx` | Banner zerados |
| `src/components/conciliacao/ResultTabs.tsx` | Badge tipo F com cor por confianca |

### Arquivos NAO alterados

- `parsers.ts` -- nenhuma alteracao
- `utils.ts` -- nenhuma alteracao
- `categorias.ts` -- nenhuma alteracao
- `CartaoCredito.tsx` -- nenhuma alteracao

### Ordem de implementacao

1. types.ts (base para tudo)
2. engine.ts (filtro zeros + contasExcluidas expandido)
3. matcher.ts (CT-e)
4. classifier.ts (tipo F + acoes melhoradas)
5. outputs.ts (PDF + MD + Excel)
6. Conciliacao.tsx (banner zerados)
7. ResultTabs.tsx (badge tipo F)
