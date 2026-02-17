

# FIX -- 4 Ajustes no Relatorio PDF e Planilha de Divergencias

## Resumo

Quatro correcoes no relatorio PDF e planilha Excel baseadas em problemas reais observados: fornecedor mostrando CNPJ, resumo executivo sem separacao de atraso, caracteres corrompidos no PDF, e colunas faltantes na planilha.

---

## Etapas de Implementacao

### 1. Corrigir `descricaoLegivel` e mapeamento do parser (`outputs.ts` + `parsers.ts`)

**Diagnostico**: O `parseOmie` ja mapeia `clienteFornecedor` corretamente (linha 140: `clienteFornecedor: col('cliente')`). O header "Cliente ou Fornecedor (Razao Social)" e detectado porque contem "CLIENTE" (linha 71). Porem, o campo `cliente` no `colMap` pode nao estar pegando a coluna correta se o header exato tiver variacao.

**Correcao em `parsers.ts`** (linhas 71):
- Expandir a deteccao do header para tambem aceitar "RAZ" (Razao Social) como parte do nome da coluna `cliente`, evitando que caia no mapeamento de `razaoSocial` separadamente quando a coluna combina ambos os conceitos.
- Mover a condicao de `RAZAO`/`RAZAO` para ser testada DEPOIS de `CLIENTE`/`FORNECEDOR`, e so mapear `razaoSocial` se `cliente` ja nao capturou essa coluna. Isso evita que a mesma coluna "Cliente ou Fornecedor (Razao Social)" seja mapeada para `razaoSocial` ao inves de `cliente`.

**Correcao em `outputs.ts`** (funcao `descricaoLegivel`, linhas 38-55):
- Expandir fallbacks para incluir campos adicionais e limpar melhor a descricao do banco:

```
function descricaoLegivel(d: Divergencia): string {
  const omie = d.omie;
  if (omie) {
    const nome = omie.clienteFornecedor || omie.razaoSocial || '';
    if (nome && nome.length > 3 && 
        !nome.toUpperCase().includes('SALDO') &&
        !/^\d{2}\.\d{3}\.\d{3}/.test(nome)) {  // Rejeitar CNPJs
      return nome.substring(0, 40);
    }
  }
  // Fallback: nome do banco
  if (d.nome && d.nome.length > 3) {
    return d.nome.substring(0, 40);
  }
  if (d.descricao) {
    return d.descricao
      .replace(/LIQUIDACAO BOLETO \d*/g, '')
      .replace(/PAGAMENTO PIX\w*/g, 'PIX')
      .replace(/PIXDEB /g, '')
      .replace(/PIXCRED /g, '')
      .replace(/DEBCTAFATURA/g, 'DEB FATURA')
      .trim()
      .substring(0, 40);
  }
  return d.cnpjCpf || '--';
}
```

A validacao com regex `^\d{2}\.\d{3}\.\d{3}` rejeita valores que sao CNPJs formatados, forcando o fallback para o nome do banco.

### 2. Resumo Executivo com coluna "Em Atraso" (`outputs.ts`)

**PDF** (linhas 678-691):
- Alterar headers da tabela de fontes de `['Fonte', 'Lancamentos', 'Entradas', 'Saidas', 'Liquido']` para `['Fonte', 'Lanc.', 'Entradas', 'Saidas', 'Em Atraso', 'Liquido']`
- Calcular `totalAtraso` a partir de divergencias tipo B* (entradas positivas em atraso)
- Subtrair atraso das entradas do Omie
- Linha Banco: coluna "Em Atraso" = "--"
- Linha Omie: coluna "Em Atraso" = valor total B*

**Markdown** (linhas 92-96):
- Mesma alteracao: adicionar coluna "Em Atraso" na tabela de resumo executivo
- Para Banco, mostrar "--"
- Para Omie, mostrar total das divergencias B*

### 3. Corrigir caracteres corrompidos no PDF (`outputs.ts`)

**3a. Banner de zerados** (linha 667):
- Remover o caractere `i` (info emoji) que gera "!9" no PDF
- Texto limpo: `${total} lancamentos com valor R$ 0,00 foram ignorados (${banco} do banco, ${omie} do Omie).`
- Usar `doc.setFillColor(230, 242, 255)` para fundo azul claro + `doc.rect()` como destaque visual ao inves de emoji

**3b. Checklist** (linhas 854-908):
- Os items ja usam `doc.setTextColor` com cores por tipo e `"●"` como bullet, que funciona em helvetica
- Verificar que nao ha emojis nos textos dos checkItems (atualmente nao ha -- estao limpos)
- Confirmar que a fonte e `helvetica` (ja esta configurado no `styles` da autoTable)

**3c. Markdown** (linha 104):
- Remover emoji `i` do banner de zerados no MD tambem (manter apenas texto)

### 4. Adicionar NF nas tabelas PDF para tipos B/F/B* (`outputs.ts`)

**PDF -- Tabelas de divergencia** (linhas 741-783):
- Para tipos B, F e B*: usar headers com 7 colunas `['#', 'Data', 'Valor', 'Fornecedor', 'NF', 'Categoria', 'Acao']`
- Para tipos A, T, C, E, G: manter 6 colunas sem NF (sao lancamentos do banco ou sem nota)
- Ajustar `bodyRows` condicionalmente:
  - Com NF: adicionar `d.omie?.notaFiscal || '--'` entre Fornecedor e Categoria
  - Sem NF: manter como esta
- Ajustar `columnStyles` para 7 colunas:
  ```
  // Com NF (7 colunas):
  0: { cellWidth: 7 },    // #
  1: { cellWidth: 18 },   // Data
  2: { cellWidth: 22, halign: 'right' },  // Valor
  3: { cellWidth: 38 },   // Fornecedor
  4: { cellWidth: 18 },   // NF
  5: { cellWidth: 30 },   // Categoria
  6: { cellWidth: 47 },   // Acao
  ```

### 5. Expandir planilha Excel de divergencias (`outputs.ts`)

**Headers** (linhas 393-398):
Adicionar 5 novas colunas apos as existentes:

```
'Fornecedor (Razao Social)',   // d.omie?.clienteFornecedor || d.omie?.razaoSocial
'Categoria',                    // d.omie?.categoria
'Situacao',                     // d.omie?.situacao  
'Projeto',                      // d.omie?.projeto
'Observacoes',                  // d.omie?.observacoes
```

**Rows** (linhas 402-424):
Para cada divergencia, adicionar os 5 novos campos no final do array.

**Column widths** (linhas 439-444):
Adicionar larguras para as novas colunas:
- Fornecedor: 40
- Categoria: 30
- Situacao: 15
- Projeto: 20
- Observacoes: 50

**Autofilter** (linha 446):
Atualizar de `A1:S` para `A1:X` (5 colunas a mais = S+5 = X).

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/conciliacao/parsers.ts` | Garantir que coluna "Cliente ou Fornecedor (Razao Social)" mapeia para `cliente` e nao para `razaoSocial` |
| `src/lib/conciliacao/outputs.ts` | descricaoLegivel com rejeicao de CNPJ; resumo com "Em Atraso"; remover emojis do PDF/MD; NF nas tabelas B/F/B*; 5 novas colunas no Excel |

## Arquivos NAO alterados

- `types.ts` -- todos os campos ja existem em `LancamentoOmie`
- `engine.ts` -- sem alteracoes
- `matcher.ts` -- sem alteracoes
- `classifier.ts` -- sem alteracoes
- `Conciliacao.tsx` -- sem alteracoes
- `ResultTabs.tsx` -- sem alteracoes

