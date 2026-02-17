

# FIX -- 3 Problemas restantes no PDF e Excel

## Resumo

Tres correcoes pontuais: bullet corrompido no checklist PDF, mapeamento de "Razao Social" (coluna S) bloqueado pelo guard, e NF potencialmente afetada por encoding.

---

## Etapas de Implementacao

### 1. Corrigir bullet corrompido no checklist PDF (`outputs.ts`)

**Causa raiz**: Linha 940 usa `●` (U+25CF BLACK CIRCLE) que NAO esta no WinAnsiEncoding do jsPDF. Isso gera `%Ï` no PDF renderizado.

**Correcao**: Substituir `●` por `-` (hifen) ou `*` (asterisco), que sao caracteres seguros no WinAnsi.

Linha 940:
```
// DE:
body: checkItems.map(item => [`●  ${item.texto}`]),
// PARA:
body: checkItems.map(item => [`- ${item.texto}`]),
```

Nenhuma outra alteracao necessaria no checklist — a fonte ja e `helvetica`, nao ha `setCharSpace`, e as cores por tipo ja funcionam via `didParseCell`.

### 2. Corrigir mapeamento de `razaoSocial` no parser (`parsers.ts`)

**Causa raiz**: Linha 82 tem o guard `!colMap['cliente']` que impede mapear `razaoSocial` quando `cliente` ja foi capturado em outra coluna. Se o Omie tem coluna C = "Cliente ou Fornecedor" (capturada pela condicao CLIENTE/FORNECEDOR na linha 71) e coluna S = "Razao Social" (separada), o guard bloqueia o mapeamento da coluna S.

**Correcao**: Trocar `!colMap['cliente']` por `colMap['cliente'] !== j`. Isso permite mapear `razaoSocial` se for uma coluna DIFERENTE de `cliente`, mas ainda evita duplicar o mapeamento quando e a mesma coluna.

Linha 82:
```
// DE:
else if ((cn.includes('RAZÃO') || cn.includes('RAZAO')) && !colMap['cliente']) colMap['razaoSocial'] = j;
// PARA:
else if ((cn.includes('RAZÃO') || cn.includes('RAZAO')) && colMap['cliente'] !== j) colMap['razaoSocial'] = j;
```

### 3. Tornar deteccao de NF mais robusta (`parsers.ts`)

**Diagnostico**: O mapeamento de NF na linha 78 (`cn.includes('NOTA FISCAL') || cn === 'NF'`) esta sintaticamente correto. Porem, se o header tiver caracteres invisíveis (BOM residual, espaco nao-quebravel) o match falha.

**Correcao**: Adicionar normalizacao extra no `cn` para remover caracteres nao-ASCII invisiveis antes da comparacao. Aplicar a TODOS os headers na iteracao:

Linha 68:
```
// DE:
const cn = String(row[j] || '').toUpperCase().trim();
// PARA:
const cn = String(row[j] || '').toUpperCase().trim().replace(/[^\x20-\x7E\u00C0-\u024F]/g, '');
```

A regex `[^\x20-\x7E\u00C0-\u024F]` remove caracteres fora do ASCII imprimivel e Latin Extended (mantem acentos como Ã, Ç, mas remove BOM, zero-width spaces, etc).

Adicionalmente, expandir a deteccao de NF para aceitar variacoes:

Linha 78:
```
// DE:
else if (cn.includes('NOTA FISCAL') || cn === 'NF') colMap['notaFiscal'] = j;
// PARA:
else if (cn.includes('NOTA FISCAL') || cn.includes('NF-E') || cn === 'NF' || cn === 'NOTA') colMap['notaFiscal'] = j;
```

### 4. Ajustar `descricaoLegivel` para priorizar `razaoSocial` (`outputs.ts`)

Com o fix do parser, o campo `razaoSocial` estara preenchido. Inverter a prioridade na funcao para usar `razaoSocial` primeiro (coluna S, que tem o nome completo), com fallback para `clienteFornecedor`:

Linha 41:
```
// DE:
const nome = omie.clienteFornecedor || omie.razaoSocial || '';
// PARA:
const nome = omie.razaoSocial || omie.clienteFornecedor || '';
```

Isso garante que o nome completo da Razao Social (coluna S) tenha prioridade sobre o campo "Cliente ou Fornecedor" (coluna C), que em alguns casos contem apenas o CNPJ.

---

## Arquivos modificados

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/lib/conciliacao/outputs.ts` | 940 | Trocar `●` por `-` no bullet do checklist |
| `src/lib/conciliacao/outputs.ts` | 41 | Inverter prioridade: `razaoSocial` antes de `clienteFornecedor` |
| `src/lib/conciliacao/parsers.ts` | 68 | Adicionar limpeza de caracteres invisiveis nos headers |
| `src/lib/conciliacao/parsers.ts` | 78 | Expandir deteccao de NF com variacoes |
| `src/lib/conciliacao/parsers.ts` | 82 | Trocar `!colMap['cliente']` por `colMap['cliente'] !== j` |

## Arquivos NAO alterados

- `types.ts` -- campos ja existem
- `engine.ts` -- sem alteracoes
- `matcher.ts` -- sem alteracoes
- `classifier.ts` -- sem alteracoes
- `Conciliacao.tsx` -- sem alteracoes
- `ResultTabs.tsx` -- sem alteracoes

