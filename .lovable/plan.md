

# FIX -- Filtrar transacoes de cartao importadas do extrato Omie

## Resumo

Adicionar filtro no parser do Omie para excluir lancamentos com documento no padrao `CARTAO-XXXX-XXX`, que sao transacoes importadas via planilha e nao devem participar da conciliacao banco vs Omie.

## Alteracao

**Arquivo:** `src/lib/conciliacao/parsers.ts`

**Onde:** Apos o loop que monta o array `lancamentos` (linha 160), antes do `return` (linha 162).

**O que fazer:**
1. Filtrar lancamentos cujo campo `documento` ou `notaFiscal` comeca com padrao `CARTAO-DDDD-DDD` (regex `/^CARTAO-\d{4}-\d{3}/`)
2. Logar quantos foram filtrados
3. Retornar apenas os lancamentos filtrados

```text
// Apos linha 160 (fim do for), antes do return:

const cartaoPattern = /^CARTAO-\d{4}-\d{3}/;
const lancamentosFiltrados = lancamentos.filter(l => {
  const doc = (l.documento || '').toUpperCase();
  const nf = (l.notaFiscal || '').toUpperCase();
  return !cartaoPattern.test(doc) && !cartaoPattern.test(nf);
});

const cartaoCount = lancamentos.length - lancamentosFiltrados.length;
if (cartaoCount > 0) {
  console.log(`[parseOmie] ${cartaoCount} transacoes de cartao importadas filtradas (CARTAO-XXXX-XXX)`);
}

return { lancamentos: lancamentosFiltrados, saldoAnterior };
```

## O que NAO muda

- engine.ts, matcher.ts, classifier.ts, outputs.ts
- Parser do extrato bancario
- Parser da fatura de cartao
- useConciliacaoStorage.ts
- Conciliacao.tsx

## Resultado esperado

Antes: ~420 lancamentos Omie, 195 aparecem como divergencias falsas
Depois: ~225 lancamentos Omie, apenas divergencias reais

