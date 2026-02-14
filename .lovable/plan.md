
# FIX-02 -- Exportacao real de PDF na DRE

## Resumo

Implementar exportacao PDF funcional no botao "Exportar PDF" da pagina DRE, substituindo o placeholder atual que apenas mostra toast.

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/lib/financeiro/exportDREPdf.ts` | **CRIAR** -- funcao de geracao PDF |
| `src/pages/FinanceiroDRE.tsx` | **EDITAR** -- substituir handler placeholder (linhas 824-827) |

## Dependencias

`jspdf` e `jspdf-autotable` ja estao instalados no projeto.

## Detalhes tecnicos

### 1. Criar `src/lib/financeiro/exportDREPdf.ts`

Funcao principal `exportDREtoPDF` com parametros:

```text
{
  dreAnual: DREAnual          // dados completos (12 meses + acumulado)
  dre: DRERelatorio           // DRE mensal selecionado
  visao: 'mensal' | 'anual'
  tipo: 'sintetico' | 'analitico'
  includeAV: boolean
  includeMargens: boolean
  includeAH: boolean
  periodoLabel: string        // ex: "Janeiro 2025" ou "Janeiro a Dezembro 2025"
  mes: string                 // nome do mes selecionado
  ano: string
}
```

**Layout do PDF:**

- Orientacao paisagem (landscape), A4
- Cabecalho: "Demonstracao do Resultado do Exercicio (DRE)" centralizado, periodo abaixo
- Tabela usando `jspdf-autotable`:
  - Visao mensal: 2 colunas (Conta | Valor) + AV% opcional
  - Visao anual: 14 colunas (Conta | Jan-Dez | Acum.) + AV% opcional
- Estilos:
  - Linhas de secao (header): fundo cinza claro, negrito, uppercase
  - Linhas de subtotal: negrito, fundo cinza claro
  - Linha de resultado final: negrito, fundo mais escuro
  - Valores negativos em vermelho
  - Formato BRL: R$ 1.234,56
  - Tipo analitico: inclui sub-linhas de categorias com indentacao
  - Margens (Bruta, EBITDA, Liquida) em italico se includeMargens=true
- Rodape: "Gerado em DD/MM/AAAA HH:MM" a esquerda, "PowerConcept" a direita
- Nome do arquivo: `DRE_{ano}_{mes}.pdf` (mensal) ou `DRE_{ano}_Anual.pdf` (anual)

**Dados lidos diretamente das estruturas `DRERelatorio` e `DREAnual`** (secoes, linhas, subtotais, resultado) -- mesmos dados ja renderizados na tela.

**Calculo de receita liquida para AV%:** obtida de `secoes[0].subtotal.valor` (mesma logica da pagina).

### 2. Editar `src/pages/FinanceiroDRE.tsx`

Substituir o handler do botao "Exportar PDF" (linhas 824-827):

```text
// De:
<Button onClick={() => {
  setPdfDialogOpen(false);
  toast({ title: 'Exportacao disponivel apos importar dados financeiros.' });
}}>

// Para:
<Button onClick={() => {
  setPdfDialogOpen(false);
  if (!hasDadosReais) {
    toast({ title: 'Importe dados financeiros antes de exportar', variant: 'destructive' });
    return;
  }
  exportDREtoPDF({
    dreAnual, dre, visao: pdfVisao, tipo: pdfTipo,
    includeAV: pdfIncludeAV, includeMargens: pdfIncludeMargens,
    includeAH: pdfIncludeAH, periodoLabel: ..., mes, ano,
  });
  toast({ title: 'PDF exportado com sucesso!' });
}}>
```

Adicionar import de `exportDREtoPDF` no topo do arquivo.

## O que NAO muda

- Nenhuma logica de calculo da DRE
- Nenhum layout da pagina
- Nenhum outro arquivo
- As aliquotas de `src/lib/financeiro/aliquotas.ts` nao sao alteradas (os impostos ja estao calculados nos dados)
