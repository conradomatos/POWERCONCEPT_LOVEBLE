
# FASE 3.2 — Correções na Exportação + Tipo T (Transferências) + PDF

## PROBLEMAS E SOLUÇÕES

### 1. FORMATO CONTÁBIL COM CORES NOS VALORES (Excel Divergências)
**Local:** `src/lib/conciliacao/outputs.ts` na função `gerarExcelDivergencias` (após linha 374)

**Problema:** As colunas numéricas não têm formatação contábil; valores negativos aparecem sem parênteses e sem cores.

**Solução:** Iterar sobre as células de valor após criar a worksheet e aplicar o `numFmt` do SheetJS:
- Colunas: F (Valor=5), K (Valor Banco=10), L (Valor Omie=11), M (Diferença=12)
- Formato: `[Blue]#,##0.00;[Red](#,##0.00);0.00` (positivos azuis, negativos vermelhos com parênteses)
- Aplicar via `ws[cellRef].z` para cada célula

### 2. TIPO T — TRANSFERÊNCIAS ENTRE CONTAS
**Locais:** 
- `src/lib/conciliacao/classifier.ts` (detectar DEB.CTA.FATURA)
- `src/lib/conciliacao/types.ts` (adicionar campo `obs`)
- `src/lib/conciliacao/outputs.ts` (adicionar tipo T em MD, Excel, descricoes)

**Problema:** Lançamento "DEB.CTA.FATURA" no banco (pagamento da fatura do cartão) está sendo classificado como Tipo A (faltando no Omie), quando na verdade é uma transferência entre contas próprias.

**Solução:**
- No `classifier.ts`: Antes de classificar lançamento banco como Tipo A, detectar se contém "DEB.CTA.FATURA" ou "FATURA CARTAO" → classificar como Tipo T
- No `types.ts`: Adicionar campo `obs?: string;` à interface `Divergencia`
- No `outputs.ts`: 
  - Adicionar `'T': 'TRANSFERÊNCIA ENTRE CONTAS'` em `tipoDescricoes`
  - Adicionar seção de tipo T no relatório MD

### 3. MAIS INFORMAÇÕES NAS DIVERGÊNCIAS
**Locais:**
- `src/lib/conciliacao/classifier.ts` (melhorar população de descrição)
- `src/lib/conciliacao/outputs.ts` (adicionar coluna de observação no Excel)

**Problemas:**
- Coluna G (Descrição/Fornecedor) no Excel frequentemente mostra apenas CNPJ ou está vazia
- Não há informação de Observações do Omie original para contexto

**Solução:**
- No `classifier.ts`: Garantir que `divergencia.descricao` contém SEMPRE a informação completa:
  - Para banco: descrição do extrato (ex: "LIQUIDACAO BOLETO...")
  - Para Omie: use `observacoes` (se disponível), senão `clienteFornecedor`, senão CNPJ
- No `outputs.ts`:
  - Adicionar coluna 19 "Observação" nos headers do Excel divergências
  - Preencher com `d.obs || ''` (que virá do campo `omie.observacoes`)
  - Aumentar autofilter para incluir coluna S
  - Adicionar coluna width `{ wch: 50 }`

### 4. RELATÓRIO PDF COM JSPDF
**Local:** `src/lib/conciliacao/outputs.ts` (nova função `gerarRelatorioPDF`)

**Problema:** Relatório está apenas em Markdown e Excel; usuários precisam de um PDF formatado e pronto para compartilhar/imprimir.

**Solução:**
- Instalar dependências: `jspdf` e `jspdf-autotable`
- Nova função `gerarRelatorioPDF(resultado)` que:
  - Cria documento PDF A4 em português
  - Header azul com título, período e data
  - KPIs em 4 cards coloridos (Conciliados/verde, Divergências/laranja, Atraso/vermelho, Cartão/azul)
  - Tabela de Fontes (Banco/Omie/Cartão)
  - Tabela de Matching por camada (A/B/C/D)
  - Seção de Divergências com subtabelas por tipo (A, T, B*, B, C, E, G)
    - Cada tipo com cor de fundo alternada
    - Colunas: #, Data, Valor, Descrição, CNPJ, Ação
    - Total por tipo na última linha
  - Seção Cartão: resumo por titular + total importação
  - Seção Checklist: lista de ações pendentes com checkboxes
  - Footer com data/hora geração
  - Arquivo: `relatorio_conciliacao_{mes}{ano}.pdf`

- No `Conciliacao.tsx`:
  - Importar `gerarRelatorioPDF`
  - Handler: `handleDownloadPDF`
  - Botão: "Relatório (.pdf)" com ícone `FileText` ao lado do .md

---

## ORDEM DE IMPLEMENTAÇÃO

1. **Adicionar tipo T em `classifier.ts`** (~20 linhas)
   - Detectar DEB.CTA.FATURA antes de classificar Tipo A
   - Marcar como Tipo T

2. **Atualizar `types.ts`** (1 linha)
   - Adicionar `obs?: string;` à interface Divergencia

3. **Melhorar descrição em `classifier.ts`** (~5 linhas)
   - Garantir que `divergencia.descricao` está preenchida corretamente

4. **Atualizar Excel divergências em `outputs.ts`** (~20 linhas)
   - Aplicar formato contábil nas 4 colunas de valor
   - Adicionar coluna "Observação" com dados de `omie.observacoes`
   - Aumentar autofilter para coluna S

5. **Adicionar tipo T no MD em `outputs.ts`** (~10 linhas)
   - Adicionar seção "Tipo T — Transferências entre contas"
   - Adicionar T em `tipoDescricoes`

6. **Criar `gerarRelatorioPDF` em `outputs.ts`** (~350 linhas)
   - Função completa com header, KPIs, tabelas, divergências coloridas, checklist

7. **Atualizar `Conciliacao.tsx`** (~15 linhas)
   - Importar `gerarRelatorioPDF`
   - Handler + botão PDF

8. **Instalar dependências**
   - `npm install jspdf jspdf-autotable`

---

## DECISÕES DE DESIGN

### Tipo T (Transferências)
- Separar transferências entre contas próprias de "divergências reais"
- Usuário sabe que precisa lançar transferência, não investigar
- Ação: "Lançar transferência Sicredi → Cartão de Crédito no Omie"

### Formato Contábil
- Padrão Excel/contabilidade: azul positivos, vermelho negativo com parênteses
- Melhora legibilidade sem precisar colorir coluna inteira
- Aplicável também no PDF (cores nos valores)

### Coluna Observação
- Campo `omie.observacoes` frequentemente tem contexto importante (ex: "Nota fiscal XYZ", "Referência cliente")
- Ajuda a validar se uma divergência é realmente um erro ou falsa correspondência

### PDF vs Markdown
- Markdown é texto puro (versionável), bom para archive/git
- PDF é visual (tabelas, cores), bom para compartilhar/imprimir
- Oferecer ambos: usuários escolhem conforme necessidade

---

## IMPACTO

- **Usuário vê melhor:** Excel com cores, descrições completas, observações de contexto
- **Transferências separadas:** Menu mais limpo, ações mais claras
- **PDF profissional:** Pode ser enviado direto para cliente/auditoria/contador
- **Sem mudança em:** Lógica de parsing, matching, engine — só outputs refinados

