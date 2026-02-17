

# Correcoes Conciliacao Financeira — 5 Fixes

## Resumo

Cinco correcoes baseadas nos testes de Fevereiro/2026: reordenar parser para capturar Razao Social e NF corretamente, corrigir campo `descricao` no classifier, adicionar filtro de datas futuras, separar atraso receber/pagar, e remover Unicode problematico do Markdown.

---

## FIX 1 — Parser: Reordenar else-if chain (parsers.ts)

**Problema**: A coluna S do Omie ("Cliente ou Fornecedor (Razao Social)") contem "CLIENTE", entao a linha 71 captura ela para `colMap['cliente']` antes que a linha 82 (RAZAO) tenha chance de mapeala para `razaoSocial`.

**Correcao**: Linhas 67-84 do `parsers.ts` -- mover o check de RAZAO/RAZAO para ANTES do check de CLIENTE/FORNECEDOR. Tambem adicionar `RAZÃ` como variante.

Nova ordem do loop:
```
if (SITUAC) ...
else if (DATA) ...
else if (RAZAO/RAZAO/RAZA) -> colMap['razaoSocial']    // ANTES de CLIENTE
else if (CLIENTE/FORNECEDOR) -> colMap['cliente']
else if (CONTA CORRENTE) ...
else if (CATEGORIA) ...
else if (VALOR) ...
else if (SALDO) ...
else if (TIPO DOC) ...
else if (DOCUMENTO) ...
else if (NOTA FISCAL/NF-E/NF/NOTA) ...
else if (PARCELA) ...
else if (ORIGEM) ...
else if (PROJETO) ...
else if (CNPJ/CPF) ...
else if (OBSERV) ...
```

Isso garante que a coluna S (que contem tanto "CLIENTE" quanto "RAZAO") sera mapeada para `razaoSocial` primeiro. A coluna C ("Cliente ou Fornecedor", sem "Razao") caira no else-if de CLIENTE.

**Adicionar logs de validacao** apos o loop (antes do fallback na linha 90):
- Log do colMap completo
- Warnings se razaoSocial ou notaFiscal nao foram encontrados

**Adicionar log final** antes do return (linha 170):
- Contagem de lancamentos com razaoSocial preenchida e com NF preenchida

## FIX 2 — Classifier: campo descricao priorizar nome (classifier.ts)

**Problema**: Linha 114 preenche `descricao` com `o.observacoes || o.clienteFornecedor || o.cnpjCpf`, fazendo com que observacoes longas ("Incluido a partir do recebimento da NF-e...") aparecam no lugar do nome do fornecedor.

**Correcao**: Linha 114 -- trocar prioridade para:
```
descricao: o.razaoSocial || o.clienteFornecedor || o.cnpjCpf || '',
```

Aplicar nas linhas 88, 114 (e qualquer outra que preencha `descricao` com `o.observacoes` primeiro).

Verificar linha 88 tambem (bloco G): atualmente usa `o.clienteFornecedor` -- manter mas adicionar `o.razaoSocial` como fallback prioritario.

## FIX 3 — Filtro de datas futuras (engine.ts + types.ts + Conciliacao.tsx + outputs.ts)

**Problema**: Lancamentos Omie com data posterior a ultima data do extrato bancario sao classificados incorretamente como tipo B.

### engine.ts

Apos a linha 117 (`const omieFiltrado = filtro.omieFiltrado;`), substituir por:

1. Detectar ultima data do banco percorrendo `bancoFiltrado`
2. Separar `filtro.omieFiltrado` em `omieDentroPeriodo` (data <= ultimaDataBanco) e `lancamentosFuturos` (data > ultimaDataBanco)
3. Usar `omieDentroPeriodo` como `omieFiltrado` para o matching
4. Calcular `totalFuturos` (soma absoluta dos valores)
5. Adicionar `lancamentosFuturos: { quantidade, total, ultimaDataBanco }` ao objeto de retorno (linha 146-168)

### types.ts

Adicionar ao `ResultadoConciliacao` (apos linha 122):
```
lancamentosFuturos?: { quantidade: number; total: number; ultimaDataBanco: string };
```

### Conciliacao.tsx

Apos o banner de zerados (linha 505), adicionar banner de futuros:
- Card azul claro com icone de calendario
- Texto: "Periodo: ate {data}. X lancamentos futuros do Omie excluidos (R$ Y)."

### outputs.ts — PDF

Apos o banner de zerados (linha 689), adicionar banner de futuros com fundo azul claro.

### outputs.ts — PDF Checklist

Antes do `if (checkItems.length > 0)` (linha 937), adicionar item de futuros ao checkItems com cor azul.

### outputs.ts — Markdown Checklist

Apos a linha 371 (antes do `L('')`), adicionar item de futuros ao checklist MD.

## FIX 4 — Separar atraso Receber vs Pagar (classifier.ts + outputs.ts + Conciliacao.tsx)

### classifier.ts

Substituir o bloco de linhas 77-124 (B/B*/G) por logica expandida:

1. `isAtrasado && isReceber` -> tipo `B*`, tipoNome `CONTA A RECEBER EM ATRASO`
2. `isAtrasado && (isPagar || isPrevisao)` -> tipo `G`, tipoNome `CONTA A PAGAR EM ATRASO`
3. `isAtrasado` sem origem clara -> classificar pelo sinal do valor (positivo = B*, negativo = G)
4. Nao atrasado -> tipo `B`, tipoNome `A MAIS NO OMIE`

Todos os blocos usam `descricao: o.razaoSocial || o.clienteFornecedor || o.cnpjCpf || ''` (do FIX 2).

### outputs.ts — tipoConfig PDF (linha 752-761)

Substituir para separar B* e G:
```
['B*', 'Contas a Receber em Atraso', [255, 243, 224]],
['G', 'Contas a Pagar em Atraso', [255, 237, 213]],
```

### outputs.ts — tipoDescricoes Excel (linhas 389-400)

Atualizar:
```
'B*': 'CONTA A RECEBER EM ATRASO',
'G': 'CONTA A PAGAR EM ATRASO',
```

### outputs.ts — Markdown tipo G (linhas 263-273)

Substituir titulo e descricao para "Contas a Pagar em Atraso".

### outputs.ts — Checklist PDF (linhas 912-915)

Substituir item B* unico por dois itens separados:
- `ATRASO RECEBER: X contas a receber em atraso, total Y - cobrar clientes` (cor vermelha)
- `ATRASO PAGAR: X contas a pagar vencidas, total Y - verificar pagamentos` (cor laranja)

### outputs.ts — Checklist MD (linhas 336-339)

Substituir item B* por dois itens separados (receber e pagar).

### Conciliacao.tsx — KPI Cards (linhas 533-539)

Substituir o card unico "Em Atraso" por dois cards:
- Card vermelho: "A Receber (atraso)" — conta divergencias B*
- Card laranja: "A Pagar (atraso)" — conta divergencias G

Alterar grid de `md:grid-cols-3` para `md:grid-cols-4` (4 cards: Conciliados, Divergencias, Receber, Pagar).

## FIX 5 — Remover Unicode problematico do Markdown (outputs.ts)

**Correcoes pontuais**:

- Linha 123: `⚠` -> `[!]`
- Linha 125: `✓` -> `[OK]`
- Linha 283: `✓` -> `OK` e `⚠` -> `[!]`

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/conciliacao/parsers.ts` | Reordenar else-if (RAZAO antes de CLIENTE), adicionar logs de validacao |
| `src/lib/conciliacao/classifier.ts` | Separar B* (receber) e G (pagar), corrigir campo descricao |
| `src/lib/conciliacao/engine.ts` | Filtro de datas futuras |
| `src/lib/conciliacao/types.ts` | Adicionar lancamentosFuturos ao ResultadoConciliacao |
| `src/lib/conciliacao/outputs.ts` | tipoConfig separado, checklist separado, banner futuros, remover Unicode, tipo G no MD |
| `src/pages/Conciliacao.tsx` | Banner futuros, KPI cards separados (receber/pagar) |

## Arquivos NAO alterados

- `matcher.ts` — sem alteracoes
- `ResultTabs.tsx` — sem alteracoes

