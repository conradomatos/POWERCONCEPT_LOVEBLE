

# Fix: Estender template da planilha de importacao do cartao para 25 colunas (A-Y)

## Problema

O Omie valida unicidade por Categoria + NF + Fornecedor + Valor + Parcela + Vencimento. Nossa planilha tem apenas 19 colunas (A-S), mas os campos validadores "Numero do Documento" (col U), "Parcela" (col V) e "Nota Fiscal" (col Y) ficam apos a coluna S. Sem eles, o Omie rejeita transacoes com mesmos valores como duplicatas.

## Alteracao unica

### `src/lib/conciliacao/outputs.ts` -- funcao `gerarExcelImportacaoCartao`

Tres blocos a substituir:

**1. Headers (linhas 430-438)**: Adicionar 6 colunas novas (T-Y):
- T: Tipo de Documento
- U: Numero do Documento (validador)
- V: Parcela (validador)
- W: Total de Parcelas
- X: Numero do Pedido
- Y: Nota Fiscal (validador)

**2. rows.push (linhas 461-466)**: Estender cada linha com os 6 campos novos:
- T: `'Outros'`
- U: `codigoIntegracao` (ex: CARTAO-0126-001)
- V: `String(seqNum)` (1, 2, 3...)
- W: `String(valid.length)` (total de transacoes)
- X: `''` (vazio)
- Y: `codigoIntegracao`

**3. ws['!cols'] (linhas 472-478)**: Adicionar larguras para as 6 colunas novas.

## Nenhum outro arquivo alterado

Apenas `outputs.ts`, apenas a funcao `gerarExcelImportacaoCartao`.

