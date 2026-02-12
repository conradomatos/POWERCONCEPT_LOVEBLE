
# Plano: Fase 2 - Motor de Conciliacao Financeira

## Resumo

Implementar o motor de conciliacao real que cruza extrato bancario (Sicredi), extrato Omie e fatura de cartao de credito. O motor executa matching em 4 camadas (A/B/C/D) com niveis de confianca decrescentes, classifica divergencias e atualiza os KPIs na pagina existente.

---

## Arquivos a Criar (6 arquivos)

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/conciliacao/categorias.ts` | Mapeamento de fornecedores para categorias do cartao |
| `src/lib/conciliacao/utils.ts` | Funcoes utilitarias: normalizacao CNPJ/CPF, parsing de datas/valores, comparacao de nomes |
| `src/lib/conciliacao/parsers.ts` | Parsers para Banco Sicredi (XLS), Omie (XLSX) e Cartao (CSV) usando `xlsx` |
| `src/lib/conciliacao/matcher.ts` | Motor de matching em 4 camadas (A=exato, B=provavel, C=agrupamento, D=scoring) |
| `src/lib/conciliacao/classifier.ts` | Classificador de divergencias (A-I) e deteccao de duplicidades |
| `src/lib/conciliacao/engine.ts` | Orquestrador que executa o pipeline completo e retorna `ResultadoConciliacao` |

## Arquivos a Modificar (2 arquivos)

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/conciliacao/types.ts` | Substituir interfaces da Fase 1 pelas novas (com campos idx, dataStr, matchCamada, etc.) |
| `src/pages/Conciliacao.tsx` | Integrar motor, estados de resultado/loading, KPIs reais, resumo de camadas |

---

## Detalhes Tecnicos

### 1. `categorias.ts`
- Objeto `CATEGORIAS_CONFIG` com mapeamento de palavras-chave de fornecedores para categorias contabeis
- Funcao `suggestCategoria(descricao)` que faz match parcial case-insensitive

### 2. `utils.ts`
- `normalizeCnpjCpf`: remove caracteres nao-numericos
- `formatCnpj`/`formatCpf`: formatacao para exibicao
- `extractCnpjCpf`: extrai CNPJ/CPF de descricoes bancarias via regex
- `extractNomeBanco`: limpa prefixos (PIX, TED, BOLETO) da descricao
- `classifyBanco`: classifica tipo do lancamento (PIX_ENVIADO, BOLETO, FOLHA, etc.)
- `nomeCompativel`/`nomeCompativelCartao`: comparacao fuzzy de nomes ignorando stop words
- `formatBRL`, `daysDiff`, `parseDate`, `parseValorBRL`: utilitarios gerais

### 3. `parsers.ts`
- `parseBanco(rows)`: Parser especifico para extrato Sicredi (dados a partir da linha 10, colunas A-E)
- `parseOmie(rows)`: Parser para extrato Omie (cabecalho linha 2, dados a partir da linha 3, ~20 colunas)
- `parseCartaoFromText(text)`: Parser para fatura CSV do cartao Sicredi (header + transacoes por titular)
- `workbookToRows(file)`: Helper que converte File -> rows[][] via xlsx
- `csvToText(file)`: Helper que le File como texto UTF-8

### 4. `matcher.ts`
Pipeline de matching em camadas com confianca decrescente:
- **Camada A** (ALTA): CNPJ identico + valor identico + data +-1 dia; ou observacoes Omie contendo descricao banco
- **Camada B** (MEDIA): Valor + data +-3 dias + nome compativel; CNPJ + valor proximo (<5%)
- **Camada C** (MEDIA): Agrupamento de multiplos lancamentos Omie que somam para 1 lancamento banco (mesmo CNPJ)
- **Camada D** (BAIXA): Sistema de scoring (CNPJ=3pts, valor=3pts, data=2pts, nome=2pts) com threshold >= 4
- **Fatura Cartao**: Match de DEB.CTA.FATURA no banco com transferencia no Omie
- **Cartao x NF**: Cruzamento de transacoes do cartao contra conta "CARTAO DE CREDITO" no Omie

### 5. `classifier.ts`
Classificacao de divergencias apos matching:
- **A**: Faltando no Omie (lancamento banco sem match)
- **B**: A mais no Omie (lancamento Omie sem match)
- **B***: Conta em atraso (Omie com situacao "Atrasado")
- **C**: Valor divergente entre match banco/Omie
- **D**: Data divergente (>3 dias) entre match
- **E**: Duplicidade detectada no Omie
- **G**: Previsto nao realizado (previsao atrasada)
- **H**: Cartao coberto por NF (ja existe no Omie)
- **I**: Cartao faltando no Omie (para importar)

### 6. `engine.ts`
Funcao `executarConciliacao(bancoFile, omieFile, cartaoFile?)` que:
1. Parseia os 3 arquivos
2. Separa Omie por conta corrente (CONCEPT_SICREDI vs CARTAO DE CREDITO)
3. Executa matching em sequencia (A -> B -> C -> D -> FaturaCartao -> CartaoNF)
4. Detecta duplicidades
5. Classifica divergencias
6. Calcula metricas e detecta mes/ano de referencia
7. Retorna `ResultadoConciliacao`

### 7. `types.ts` (substituicao)
Interfaces atualizadas com campos adicionais necessarios para o motor:
- `LancamentoBanco`: adiciona `idx`, `dataStr`, `documento`, `matchType`, `matchCamada`, `matchOmieIdx`
- `LancamentoOmie`: adiciona `idx`, `dataStr`, `contaCorrente`, `tipoDoc`, `notaFiscal`, `parcela`, `origem`, `projeto`, `razaoSocial`, `observacoes`, `matchBancoIdx`
- `TransacaoCartao`: adiciona `dataStr`, `titular`, `cartao`, `isPagamentoFatura`, `isEstorno`, `matchedNf`, campos de match
- `CartaoInfo`: campos de fatura (vencimento, valores, situacao)
- `Match`: `camada` + `tipo` em vez de `confianca`/`detalhe`
- `Divergencia`: campos flexiveis para diferentes tipos
- `ResultadoConciliacao`: resultado completo com arrays, contagens por camada e metricas

### 8. `Conciliacao.tsx` (modificacoes)
- Importar `executarConciliacao` e `ResultadoConciliacao`
- Adicionar estados: `resultado` (ResultadoConciliacao | null), `processando` (boolean)
- Substituir handler placeholder por chamada real ao motor
- KPIs mostram dados reais: `resultado?.totalConciliados`, `totalDivergencias`, `contasAtraso`, `cartaoImportaveis`
- Badge Ref atualizado com `resultado.mesLabel/anoLabel`
- Botao com loading state (icone Loader2 animado)
- Novo card "Resultado do Matching" com contagens por camada (A/B/C/D)
- Botoes de download permanecem desabilitados (Fase 3)
- Importar `Loader2` do lucide-react

---

## Ordem de Implementacao

1. `src/lib/conciliacao/types.ts` (substituir)
2. `src/lib/conciliacao/categorias.ts` (criar)
3. `src/lib/conciliacao/utils.ts` (criar)
4. `src/lib/conciliacao/parsers.ts` (criar)
5. `src/lib/conciliacao/matcher.ts` (criar)
6. `src/lib/conciliacao/classifier.ts` (criar)
7. `src/lib/conciliacao/engine.ts` (criar)
8. `src/pages/Conciliacao.tsx` (modificar)

---

## Nao incluso nesta fase

- Geracao dos arquivos de download (Fase 3)
- Tabelas no banco de dados
- Edge Functions
