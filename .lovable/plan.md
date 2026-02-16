

# Simplificar conciliacao do cartao -- remover deduplicacao NF

## Resumo

Remover toda a logica de cruzamento cartao x NF do Omie. Agora toda transacao do cartao (exceto pagamento de fatura e estorno) e importavel diretamente. A funcao `matchFaturaCartao` (banco x fatura) continua inalterada.

---

## Alteracoes

### 1. `src/lib/conciliacao/types.ts`

- Remover campos de `TransacaoCartao`: `matchedNf`, `matchOmieIdx`, `matchFornecedorOmie`, `matchTipoDoc`, `matchNf`
- Remover `omieCartao` de `ResultadoConciliacao`
- Renomear `omieSicredi` para `omie` em `ResultadoConciliacao` (ou manter como `omieSicredi` para compatibilidade -- manter como `omieSicredi` para minimizar impacto nos outputs)

### 2. `src/lib/conciliacao/matcher.ts`

- Remover a funcao `matchCartaoNf` inteira (linhas 248-292)
- Remover import de `nomeCompativelCartao` (nao usado em mais nenhum lugar)
- Remover import de `suggestCategoria` (movido para engine.ts)
- Remover `TransacaoCartao` do import de types

### 3. `src/lib/conciliacao/engine.ts`

- Remover import de `matchCartaoNf`
- Remover a separacao `omieSicredi` / `omieCartao` (variaveis `contaCartaoKeywords`, `omieSicredi`, `omieCartao` e console.logs associados)
- Usar `omie` diretamente em todas as chamadas de matching (camadas A-D) e em `matchFaturaCartao`
- Remover chamada `matchCartaoNf(cartaoTransacoes, omieCartao)`
- Adicionar import de `suggestCategoria` e chamar apos parse do cartao:

```text
for (const t of cartaoTransacoes) {
  if (!t.isPagamentoFatura && !t.isEstorno) {
    t.categoriaSugerida = suggestCategoria(t.descricao);
  }
}
```

- Atualizar chamada `classifyDivergencias` removendo parametro `omieCartao`
- Remover `omieCartao` do retorno; manter `omieSicredi: omie` (apontando para o array completo)

### 4. `src/lib/conciliacao/classifier.ts`

- Remover parametro `omieCartao` da assinatura de `classifyDivergencias`
- Renomear parametro `omieSicredi` para `omie`
- Remover bloco tipo H inteiro (loop que gera "CARTAO - COBERTO POR NF")
- No bloco tipo I, remover condicao `!t.matchedNf`, ficando apenas `!t.isPagamentoFatura && !t.isEstorno`
- Renomear tipoNome de "CARTAO - FALTANDO NO OMIE" para "CARTAO - IMPORTAR"

### 5. `src/lib/conciliacao/outputs.ts`

Atualizar todas as referencias:
- Remover filtro `!t.matchedNf` de todas as contagens de transacoes importaveis (linhas 275, 320, 442, 548, 726, 767)
- Remover secao "NFs cobertas pelo cartao" do relatorio MD (bloco que filtra tipo H, linhas ~261-273)
- Manter referencias a `r.omieSicredi` pois o campo continua existindo no tipo (apenas aponta para o array completo agora)

### 6. `src/pages/Conciliacao.tsx`

Nenhuma alteracao necessaria -- a pagina nao referencia `omieCartao` nem `matchedNf` diretamente. Os KPIs usam `resultado.cartaoImportaveis` que e calculado no engine.

---

## O que NAO muda

| Item | Status |
|---|---|
| `matchFaturaCartao()` no matcher.ts | Mantida |
| Camadas de matching A, B, C, D | Inalteradas |
| Tipo T (transferencia entre contas) | Inalterado |
| `parsers.ts` | Inalterado |
| `suggestCategoria` em categorias.ts | Mantida, agora chamada no engine |
| `nomeCompativelCartao` em utils.ts | Pode ficar (nao causa problema), mas nao e mais usada |

---

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/lib/conciliacao/types.ts` | Remover 5 campos de TransacaoCartao, remover omieCartao do resultado |
| `src/lib/conciliacao/matcher.ts` | Remover funcao matchCartaoNf, limpar imports |
| `src/lib/conciliacao/engine.ts` | Remover separacao omie/cartao, adicionar suggestCategoria, simplificar fluxo |
| `src/lib/conciliacao/classifier.ts` | Remover param omieCartao, remover tipo H, simplificar tipo I |
| `src/lib/conciliacao/outputs.ts` | Remover filtros matchedNf e secao tipo H |

