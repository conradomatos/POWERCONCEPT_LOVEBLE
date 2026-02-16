

# Fix: Planilha importacao cartao vazia + duplicatas no Omie

## Diagnostico

Apos revisar os arquivos:

- **engine.ts**: OK -- `suggestCategoria` ja e chamada (linha 55), `cartaoTransacoes` esta no retorno (linha 105)
- **classifier.ts**: OK -- bloco tipo I funciona corretamente (linha 169-183), sem referencia a `matchedNf`
- **outputs.ts**: PROBLEMA -- na funcao `gerarExcelImportacaoCartao`, o campo "Codigo de Integracao" esta vazio (linha 454: `''`), causando rejeicao por duplicata no Omie

O Problema 1 (planilha vazia) pode nao ser reprodutivel no codigo atual -- o fluxo parece correto. Se persistir, sera um problema no parse do CSV do cartao. O Problema 2 (duplicatas no Omie) e claro e reprodutivel.

## Alteracao unica

### `src/lib/conciliacao/outputs.ts` -- funcao `gerarExcelImportacaoCartao` (linhas 447-459)

Substituir o loop que gera as linhas da planilha para:

1. Adicionar contador sequencial (`seqNum`)
2. Gerar "Codigo de Integracao" unico: `CARTAO-{MMAA}-{SEQ}` (ex: `CARTAO-0126-001`)
3. Incluir referencia ao codigo nas Observacoes como seguranca extra

```text
-- ANTES (linha 454):
rows.push(['', '', 'CARTAO DE CREDITO', cat, ...])

-- DEPOIS:
let seqNum = 1;
for (const t of valid) {
  const codigoIntegracao = `CARTAO-${mesAnoRef}-${String(seqNum).padStart(3, '0')}`;
  // ...obs inclui `| Ref: ${codigoIntegracao}`
  rows.push(['', codigoIntegracao, 'CARTAO DE CREDITO', cat, ...])
  seqNum++;
}
```

## Nenhuma alteracao em

| Arquivo | Motivo |
|---|---|
| engine.ts | suggestCategoria ja chamada, cartaoTransacoes no retorno |
| classifier.ts | Tipo I ja funciona sem matchedNf |
| types.ts | Nenhuma mudanca necessaria |
| matcher.ts | matchFaturaCartao mantida |

