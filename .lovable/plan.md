
# PLANO: FASE 3 — Geração de Downloads (Relatório, Divergências, Importação Cartão)

## RESUMO EXECUTIVO

Implementar a geração dos 3 arquivos de download que são o output final da conciliação financeira:
1. **Relatório Markdown (.md)** — Resumo executivo, matching por camada, divergências organizadas por tipo, checklist de ações
2. **Excel de Divergências (.xlsx)** — Tabela completa com todos os 18 tipos de divergências (A-I) em formato importável
3. **Excel de Importação Cartão (.xlsx)** — Template no formato Omie para importar transações de cartão faltantes

A implementação usa apenas **cliente-side** (browser) com a lib `xlsx` (SheetJS) que já está instalada. Sem Node.js, sem API, sem Edge Functions.

---

## ARQUITETURA

### Novo arquivo: `src/lib/conciliacao/outputs.ts` (355 linhas)
Módulo de geração de outputs com 3 funções principais:

1. **`gerarRelatorioMD(resultado)`**
   - Gera markdown com seções: Resumo Executivo → Matching → Divergências → Cartão → Checklist
   - Agrupa divergências por tipo (A, B, B*, C, D, E, G, H, I)
   - Calcula totais, períodos, saldos, contabiliza métricas
   - Faz download via `downloadFile()` helper (cria Blob → ObjectURL → simula clique em `<a>`)
   - Nomeia arquivo: `relatorio_conciliacao_{mes}{ano}.md`

2. **`gerarExcelDivergencias(resultado)`**
   - Cria XLSX com cabeçalhos: #, Tipo, Descrição Tipo, Fonte, Data, Valor, Descrição/Fornecedor, CNPJ/CPF, Situação, Origem, etc.
   - Uma linha por divergência do array `resultado.divergencias`
   - Aplica largura de colunas dinâmica (coluna fornecedor = 42ch, etc.)
   - Ativa auto-filtro (row/column filters) na primeira linha
   - Usa `XLSX.utils.aoa_to_sheet()` para converter array-of-arrays → Sheet
   - Nomeia arquivo: `divergencias_{mes}{ano}.xlsx`

3. **`gerarExcelImportacaoCartao(resultado)`**
   - Cria XLSX no **formato Omie** com template de Contas a Pagar
   - Header informativo (3 linhas): "IMPORTAÇÃO", "Fatura Cartão — Venc. {data}", "Gerado em: {data}"
   - Colunas Omie: Código Integração, Fornecedor, Categoria, Conta Corrente, Valor, Datas, etc.
   - Filtra transações válidas: `!isPagamentoFatura && !isEstorno && !matchedNf`
   - Para cada transação:
     - Usa categoria sugerida (de `categoriaSugerida` ou via `suggestCategoria()` fallback)
     - Data Registro = data compra, Data Vencimento = data fatura
     - Observações = titular + parcela (se houver)
   - Nomeia arquivo: `importacao_cartao_{mes}{ano}.xlsx`

### Helper `downloadFile(content, filename, mimeType)`
- Cria Blob a partir de string ou Blob
- Cria ObjectURL temporário
- Simula clique em `<a>` tag (appendChild → click → removeChild)
- Revoga URL para libertar memória

### Utilitários
- `formatBRL(valor)` → "R$ 1.234,56" ou "-R$ 567,89"
- `formatDateBR(date)` → "15/01/2025"

---

## MODIFICAÇÕES EM `src/pages/Conciliacao.tsx`

### 1. Novo import (linha 25)
```typescript
import { gerarRelatorioMD, gerarExcelDivergencias, gerarExcelImportacaoCartao } from '@/lib/conciliacao/outputs';
```

### 2. Três funções handler (antes do return, ~linha 330)
```typescript
const handleDownloadRelatorio = () => {
  if (!resultado) return;
  try {
    gerarRelatorioMD(resultado);
    toast({ title: "Relatório gerado", description: "Download do relatório .md iniciado" });
  } catch (error) {
    // erro handling
  }
};

const handleDownloadDivergencias = () => {
  if (!resultado) return;
  try {
    gerarExcelDivergencias(resultado);
    toast({ title: "Divergências geradas", description: "Download do Excel iniciado" });
  } catch (error) { /* ... */ }
};

const handleDownloadImportacao = () => {
  if (!resultado) return;
  try {
    gerarExcelImportacaoCartao(resultado);
    toast({ title: "Importação gerada", description: "Download do Excel de importação iniciado" });
  } catch (error) { /* ... */ }
};
```

### 3. Atualizar 3 botões (linhas 397-405)
Mudar de `disabled` para `onClick={handler}` e habilitar condicionalmente:

```tsx
<Button 
  variant="outline" 
  disabled={!resultado} 
  onClick={handleDownloadRelatorio} 
  className="gap-2"
>
  <Download className="h-4 w-4" /> Relatório (.md)
</Button>

<Button 
  variant="outline" 
  disabled={!resultado} 
  onClick={handleDownloadDivergencias} 
  className="gap-2"
>
  <Download className="h-4 w-4" /> Divergências (.xlsx)
</Button>

<Button 
  variant="outline" 
  disabled={!resultado} 
  onClick={handleDownloadImportacao} 
  className="gap-2"
>
  <Download className="h-4 w-4" /> Importação Cartão (.xlsx)
</Button>
```

---

## FLUXO DE USO

1. **Upload** → Usuário faz upload de 3 arquivos (Banco, Omie, Cartão)
2. **Executa Conciliação** → Motor processa e retorna `ResultadoConciliacao`
3. **KPIs atualizam** → Mostram 357 conciliados, 323 divergências, etc.
4. **Botões de Download** → Agora habilitados (`disabled={!resultado}`)
5. **Usuário clica em Relatório** → Browser faz download de `relatorio_conciliacao_jan2026.md`
6. **Usuário clica em Divergências** → Browser faz download de `divergencias_jan2026.xlsx`
7. **Usuário clica em Importação Cartão** → Browser faz download de `importacao_cartao_jan2026.xlsx`

---

## DECISÕES DE DESIGN

### Markdown vs XLSX para Relatório
- Markdown é mais legível em editores de texto/GitHub e pode ser versionado no git
- Contém seções bem estruturadas: Resumo → Matching → Divergências → Checklist
- Ideal para documentar o processo de conciliação

### Excel de Divergências vs MD
- Excel oferece sorting/filtering (auto-filtro) nativo
- Dados estruturados em colunas (tipo, valor, ação) são mais fáceis de revisar em planilha
- Permite marcar como "Resolvido" em coluna adicional (se necessário em futuro)

### Importação Cartão em Formato Omie
- Template segue exatamente as colunas que Omie espera
- Linhas de instrução no topo (informativo, não processado)
- Data Registro = data da compra, Data Vencimento = vencimento fatura
- Categoria sugerida via `suggestCategoria()` para facilitar entrada rápida

### Browser-side só (sem servidor)
- XLSX (SheetJS) suporta geração de Excel direto no browser
- Evita overhead de servidor, latência, autenticação extra
- Dados não saem do navegador (privado)

---

## VALIDAÇÕES E TESTES

Após implementação:
1. **Upload 3 arquivos** → Executa conciliação
2. **Clica Relatório (.md)** → Download .md abre em editor/browser, verifica formato Markdown
3. **Clica Divergências (.xlsx)** → Download .xlsx abre em Excel, verifica colunas, auto-filtro, dados completos
4. **Clica Importação Cartão (.xlsx)** → Download .xlsx no formato Omie
   - Verifica se categorias sugeridas fazem sentido
   - Verifica se datas estão corretas
   - Confirma que filtrou as transações de "Pagamento de Fatura"
5. **Testa sem resultado** → Botões desabilitados
6. **Verifica nomes de arquivos** → Formato `{relatorio|divergencias|importacao}_{mes}{ano}.{md|xlsx}`

---

## IMPACTO E DEPENDÊNCIAS

- **Nenhuma dependência nova** — usa `xlsx` que já está instalado
- **Sem mudanças em parsers, matcher, classifier, engine** — apenas leitura de `ResultadoConciliacao`
- **Sem mudança em tipos** — usa tipos já existentes em `types.ts`
- **Sem Edge Functions** — tudo é browser-side
- **Sem Supabase** — não precisa de tabelas ou storage

---

## ORDEM DE IMPLEMENTAÇÃO

1. **Criar `src/lib/conciliacao/outputs.ts`** — Copiar código completo (355 linhas)
2. **Atualizar `src/pages/Conciliacao.tsx`** — Adicionar import, 3 handlers, atualizar 3 botões
3. **Testar** — Upload, Executar, Download cada arquivo

---

## ENTREGA

- Fase 3 completa: Usuário pode baixar 3 arquivos de output prontos para análise e ação
- Relatório pode ser arquivado/compartilhado
- Excel de divergências é pronto para trabalhar (filtros, sorting)
- Excel de importação Cartão é pronto para copiar/colar no Omie
