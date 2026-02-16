

# Fix: Limpar colunas Parcela e Total de Parcelas na planilha de importacao

## Problema

As colunas V (Parcela) e W (Total de Parcelas) estao preenchidas com valores sequenciais, fazendo o Omie interpretar todas as transacoes como um unico titulo parcelado. Cada transacao do cartao e uma conta independente -- esses campos devem ficar vazios.

## Alteracao

### `src/lib/conciliacao/outputs.ts` (linhas 501-502)

Substituir:
- Linha 501: `String(seqNum)` por `''`
- Linha 502: `String(valid.length)` por `''`

Nenhum outro arquivo ou linha alterado.

