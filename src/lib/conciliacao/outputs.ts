import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoConciliacao, Divergencia } from './types';
import { CATEGORIAS_CONFIG, suggestCategoria } from './categorias';

// ============================================================
// UTILITÁRIOS
// ============================================================

function formatBRL(valor: number): string {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  const abs = Math.abs(valor);
  const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return valor < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
}

function formatDateBR(date: Date | null): string {
  if (!date) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// 1. RELATÓRIO MARKDOWN
// ============================================================

export function gerarRelatorioMD(resultado: ResultadoConciliacao): void {
  const r = resultado;
  const lines: string[] = [];
  const L = (s: string) => lines.push(s);

  L(`# RELATÓRIO DE CONCILIAÇÃO FINANCEIRA`);
  L(`## CONCEPT Engenharia — ${r.mesLabel}/${r.anoLabel}`);
  L(`**Gerado em:** ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  L('');
  L('---');
  L('');

  // ---- 1. RESUMO EXECUTIVO ----
  L('## 1. RESUMO EXECUTIVO');
  L('');

  const totalEntradasBanco = r.banco.filter(b => b.valor > 0).reduce((s, b) => s + b.valor, 0);
  const totalSaidasBanco = r.banco.filter(b => b.valor < 0).reduce((s, b) => s + b.valor, 0);
  const totalEntradasOmie = r.omieSicredi.filter(o => o.valor > 0).reduce((s, o) => s + o.valor, 0);
  const totalSaidasOmie = r.omieSicredi.filter(o => o.valor < 0).reduce((s, o) => s + o.valor, 0);

  let periodoBanco = '-';
  if (r.banco.length > 0) {
    const datas = r.banco.map(b => b.data).filter(d => d instanceof Date);
    if (datas.length > 0) {
      const min = new Date(Math.min(...datas.map(d => d.getTime())));
      const max = new Date(Math.max(...datas.map(d => d.getTime())));
      periodoBanco = `${min.getDate().toString().padStart(2, '0')}/${(min.getMonth() + 1).toString().padStart(2, '0')} a ${formatDateBR(max)}`;
    }
  }

  L('| Fonte | Período | Lançamentos | Entradas | Saídas | Líquido |');
  L('|-------|---------|-------------|----------|--------|---------|');
  L(`| Banco | ${periodoBanco} | ${r.banco.length} | ${formatBRL(totalEntradasBanco)} | ${formatBRL(totalSaidasBanco)} | ${formatBRL(totalEntradasBanco + totalSaidasBanco)} |`);
  L(`| Omie (Sicredi) | ${periodoBanco} | ${r.omieSicredi.length} | ${formatBRL(totalEntradasOmie)} | ${formatBRL(totalSaidasOmie)} | ${formatBRL(totalEntradasOmie + totalSaidasOmie)} |`);

  if (r.cartaoInfo) {
    L(`| Cartão | Venc. ${r.cartaoInfo.vencimento} | ${r.cartaoTransacoes.length} trans. | — | ${formatBRL(-r.cartaoInfo.valorTotal)} | — |`);
  }
  L('');

  const diffSaldo = (r.saldoBanco || 0) - (r.saldoOmie || 0);
  L('| Item | Valor |');
  L('|------|-------|');
  L(`| Saldo anterior Banco | ${formatBRL(r.saldoBanco || 0)} |`);
  L(`| Saldo anterior Omie | ${formatBRL(r.saldoOmie || 0)} |`);
  if (Math.abs(diffSaldo) > 0.01) {
    L(`| **Diferença saldo anterior** | **${formatBRL(diffSaldo)} ⚠** |`);
  } else {
    L(`| **Diferença saldo anterior** | **R$ 0,00 ✓** |`);
  }
  L('');

  L('### Resultado do Matching');
  L('');
  L('| Camada | Confiança | Qtd |');
  L('|--------|-----------|-----|');
  const camadas: [string, string][] = [['A', 'ALTA'], ['B', 'MÉDIA'], ['C', 'MÉDIA (agrupamento)'], ['D', 'BAIXA']];
  for (const [cam, conf] of camadas) {
    L(`| ${cam} | ${conf} | ${r.camadaCounts[cam] || 0} |`);
  }
  L(`| **Total** | | **${r.totalConciliados}** |`);
  L('');
  L('---');
  L('');

  // ---- 2. DIVERGÊNCIAS ----
  L('## 2. DIVERGÊNCIAS');
  L('');

  const divByTipo: Record<string, Divergencia[]> = {};
  for (const d of r.divergencias) {
    if (!divByTipo[d.tipo]) divByTipo[d.tipo] = [];
    divByTipo[d.tipo].push(d);
  }

  if (divByTipo['A']?.length) {
    const divs = divByTipo['A'];
    L('### Tipo A — Faltando no Omie');
    L('> Lançamentos no extrato bancário sem correspondência no Omie.');
    L('');
    L('| # | Data | Valor | Descrição | CNPJ | Ação |');
    L('|---|------|-------|-----------|------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 50)} | ${d.cnpjCpf || ''} | Lançar no Omie |`);
    });
    const totalA = divs.reduce((s, d) => s + d.valor, 0);
    L(`| | | **${formatBRL(totalA)}** | **${divs.length} itens** | | |`);
    L('');
  }

  if (divByTipo['T']?.length) {
    const divs = divByTipo['T'];
    L('### Tipo T — Transferências entre contas');
    L('> Pagamentos de fatura de cartão ou movimentações entre contas próprias.');
    L('');
    L('| # | Data | Valor | Descrição | Ação |');
    L('|---|------|-------|-----------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 50)} | ${d.acao || 'Lançar transferência no Omie'} |`);
    });
    const totalT = divs.reduce((s, d) => s + d.valor, 0);
    L(`| | | **${formatBRL(totalT)}** | **${divs.length} itens** | |`);
    L('');
  }

  if (divByTipo['B*']?.length) {
    const divs = divByTipo['B*'];
    L('### Contas em Atraso');
    L('> Contas com situação "Atrasado" no Omie.');
    L('');
    L('| # | Data | Valor | Fornecedor/Cliente | CNPJ | Tipo | Ação |');
    L('|---|------|-------|--------------------|------|------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 40)} | ${d.cnpjCpf || ''} | ${d.origem || ''} | ${d.acao || ''} |`);
    });
    const totalAtraso = divs.reduce((s, d) => s + d.valor, 0);
    L(`| | | **${formatBRL(totalAtraso)}** | **${divs.length} itens** | | | |`);
    L('');
  }

  if (divByTipo['B']?.length) {
    const divs = divByTipo['B'];
    L('### Tipo B — A mais no Omie');
    L('> Lançamentos no Omie sem correspondência no banco.');
    L('');
    L('| # | Data | Valor | Fornecedor | Situação | Origem | Ação |');
    L('|---|------|-------|------------|----------|--------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 35)} | ${d.situacao || ''} | ${d.origem || ''} | Investigar |`);
    });
    const totalB = divs.reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`| | | **${formatBRL(totalB)}** | **${divs.length} itens** | | | |`);
    L('');
  }

  if (divByTipo['C']?.length) {
    const divs = divByTipo['C'];
    L('### Tipo C — Valor divergente');
    L('');
    L('| # | Data | Valor Banco | Valor Omie | Diferença | Fornecedor | Ação |');
    L('|---|------|-------------|------------|-----------|------------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valorBanco || 0)} | ${formatBRL(d.valorOmie || 0)} | ${formatBRL(d.diferenca || 0)} | ${(d.descricao || '').substring(0, 35)} | Corrigir valor |`);
    });
    L('');
  }

  if (divByTipo['D']?.length) {
    const divs = divByTipo['D'];
    L('### Tipo D — Data divergente');
    L('');
    L('| # | Descrição | Valor | Data Banco | Data Omie | Diferença | Ação |');
    L('|---|-----------|-------|------------|-----------|-----------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${(d.descricao || '').substring(0, 35)} | ${formatBRL(d.valor)} | ${d.dataBanco || ''} | ${d.dataOmie || ''} | ${d.diasDiferenca || ''} dias | Corrigir data |`);
    });
    L('');
  }

  if (divByTipo['E']?.length) {
    const divs = divByTipo['E'];
    L('### Tipo E — Duplicidades no Omie');
    L('');
    L('| # | Data | Valor | Fornecedor | Ação |');
    L('|---|------|-------|------------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 40)} | Remover duplicata |`);
    });
    L('');
  }

  if (divByTipo['G']?.length) {
    const divs = divByTipo['G'];
    L('### Tipo G — Previstos não realizados');
    L('');
    L('| # | Data | Valor | Fornecedor | Situação | Ação |');
    L('|---|------|-------|------------|----------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 35)} | ${d.situacao || ''} | Verificar |`);
    });
    L('');
  }

  L('---');
  L('');

  // ---- 3. CARTÃO DE CRÉDITO ----
  L('## 3. CARTÃO DE CRÉDITO');
  L('');

  if (r.cartaoInfo) {
    const faturaMatch = r.matches.some(m => m.tipo === 'fatura_cartao') ? 'OK ✓' : 'NÃO ENCONTRADO ⚠';
    L(`**Fatura:** Venc. ${r.cartaoInfo.vencimento} | Total: ${formatBRL(r.cartaoInfo.valorTotal)} | Match DEB.CTA.FATURA: **${faturaMatch}**`);
    L('');

    const titularStats: Record<string, { count: number; total: number }> = {};
    for (const t of r.cartaoTransacoes) {
      if (!t.isPagamentoFatura && !t.isEstorno) {
        const tit = t.titular || 'DESCONHECIDO';
        if (!titularStats[tit]) titularStats[tit] = { count: 0, total: 0 };
        titularStats[tit].count++;
        titularStats[tit].total += Math.abs(t.valor);
      }
    }

    if (Object.keys(titularStats).length > 0) {
      L('| Titular | Transações | Total |');
      L('|---------|-----------|-------|');
      const sorted = Object.entries(titularStats).sort((a, b) => b[1].total - a[1].total);
      for (const [tit, stats] of sorted) {
        L(`| ${tit} | ${stats.count} | ${formatBRL(stats.total)} |`);
      }
      const totalTit = Object.values(titularStats).reduce((s, v) => s + v.total, 0);
      const countTit = Object.values(titularStats).reduce((s, v) => s + v.count, 0);
      L(`| **TOTAL** | **${countTit}** | **${formatBRL(totalTit)}** |`);
      L('');
    }

    const nfsCobertas = r.divergencias.filter(d => d.tipo === 'H');
    if (nfsCobertas.length > 0) {
      L('### NFs cobertas pelo cartão (NÃO lançar)');
      L('');
      L('| # | Data | Valor | Fornecedor (Omie) | NF |');
      L('|---|------|-------|-------------------|-----|');
      nfsCobertas.forEach((d, i) => {
        L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 35)} | ${d.nf || ''} |`);
      });
      const totalNf = nfsCobertas.reduce((s, d) => s + Math.abs(d.valor), 0);
      L(`| | | **${formatBRL(totalNf)}** | **${nfsCobertas.length} NFs** | |`);
      L('');
    }

    const validImport = r.cartaoTransacoes.filter(t => !t.isPagamentoFatura && !t.isEstorno && !t.matchedNf);
    const totalImport = validImport.reduce((s, t) => s + Math.abs(t.valor), 0);
    L(`**Transações para importar:** ${validImport.length} transações, total ${formatBRL(totalImport)}`);
    L('');
  }

  L('---');
  L('');

  // ---- 4. CHECKLIST ----
  L('## 4. CHECKLIST DE FECHAMENTO');
  L('');

  const divCounts: Record<string, number> = {};
  for (const d of r.divergencias) {
    divCounts[d.tipo] = (divCounts[d.tipo] || 0) + 1;
  }

  if (divCounts['T']) {
    const totalT = r.divergencias.filter(d => d.tipo === 'T').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **TRANSFERÊNCIAS:** ${divCounts['T']} transferências entre contas, total ${formatBRL(totalT)} — lançar no Omie`);
  }
  if (divCounts['A']) {
    const totalA = r.divergencias.filter(d => d.tipo === 'A').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **FALTANDO:** ${divCounts['A']} lançamentos faltando no Omie, total ${formatBRL(totalA)}`);
  }
  if (divCounts['B*']) {
    const totalAtraso = r.divergencias.filter(d => d.tipo === 'B*').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **ATRASO:** ${divCounts['B*']} contas em atraso, total ${formatBRL(totalAtraso)} — cobrar/verificar`);
  }
  if (divCounts['B']) {
    const totalB = r.divergencias.filter(d => d.tipo === 'B').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **A MAIS:** ${divCounts['B']} lançamentos a mais no Omie, total ${formatBRL(totalB)} — investigar`);
  }
  if (divCounts['C']) {
    const totalC = r.divergencias.filter(d => d.tipo === 'C').reduce((s, d) => s + Math.abs(d.diferenca || 0), 0);
    L(`- [ ] **VALORES:** ${divCounts['C']} com valor divergente, diferença total ${formatBRL(totalC)}`);
  }
  if (divCounts['D']) {
    L(`- [ ] **DATAS:** ${divCounts['D']} com data divergente — corrigir`);
  }
  if (divCounts['E']) {
    L(`- [ ] **DUPLICIDADES:** ${divCounts['E']} duplicatas no Omie — remover`);
  }

  const validImportCheck = r.cartaoTransacoes.filter(t => !t.isPagamentoFatura && !t.isEstorno && !t.matchedNf);
  if (validImportCheck.length > 0) {
    const totalImportCheck = validImportCheck.reduce((s, t) => s + Math.abs(t.valor), 0);
    L(`- [ ] **CARTÃO:** Importar planilha com ${validImportCheck.length} despesas, total ${formatBRL(totalImportCheck)}`);
  }

  if (Math.abs(diffSaldo) > 0.01) {
    L(`- [ ] **SALDO:** Diferença de saldo anterior ${formatBRL(diffSaldo)} — investigar`);
  }

  if ((r.camadaCounts['D'] || 0) > 0) {
    L(`- [ ] **REVISAR:** ${r.camadaCounts['D']} matches com baixa confiança`);
  }

  L('');
  L('---');
  L(`*Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — Conciliação Financeira CONCEPT Engenharia*`);

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  const content = '\uFEFF' + lines.join('\n');
  downloadFile(content, `relatorio_conciliacao_${sufixo}.md`, 'text/markdown;charset=utf-8');
}

// ============================================================
// 2. EXCEL DE DIVERGÊNCIAS
// ============================================================

export function gerarExcelDivergencias(resultado: ResultadoConciliacao): void {
  const r = resultado;

  const tipoDescricoes: Record<string, string> = {
    'A': 'FALTANDO NO OMIE',
    'T': 'TRANSFERÊNCIA ENTRE CONTAS',
    'B': 'A MAIS NO OMIE',
    'B*': 'CONTA EM ATRASO',
    'C': 'VALOR DIVERGENTE',
    'D': 'DATA DIVERGENTE',
    'E': 'DUPLICIDADE',
    'F': 'POSSÍVEL MATCH (REVISAR)',
    'G': 'PREVISTO NÃO REALIZADO',
    'H': 'CARTÃO - COBERTO POR NF',
    'I': 'CARTÃO - FALTANDO NO OMIE',
  };

  const headers = [
    '#', 'Tipo', 'Descrição Tipo', 'Fonte', 'Data', 'Valor (R$)',
    'Descrição/Fornecedor', 'CNPJ/CPF', 'Situação', 'Origem',
    'Valor Banco', 'Valor Omie', 'Diferença', 'Dias Diferença',
    'Titular Cartão', 'Categoria Sugerida', 'NF', 'Ação Sugerida', 'Observação'
  ];

  const rows: unknown[][] = [headers];

  r.divergencias.forEach((d, i) => {
    rows.push([
      i + 1,
      d.tipo,
      tipoDescricoes[d.tipo] || d.tipo,
      d.fonte || '',
      d.data || '',
      d.valor || '',
      d.descricao || '',
      d.cnpjCpf || '',
      d.situacao || '',
      d.origem || '',
      d.valorBanco || '',
      d.valorOmie || '',
      d.diferenca || '',
      d.diasDiferenca || '',
      d.titular || '',
      d.categoriaSugerida || '',
      d.nf || '',
      d.acao || '',
      d.obs || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Aplicar formato contábil nas colunas de valor
  const valorColumns = [5, 10, 11, 12]; // F=5, K=10, L=11, M=12 (0-indexed)
  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    for (const colIdx of valorColumns) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
        ws[cellRef].z = '[Blue]#,##0.00;[Red](#,##0.00);0.00';
      }
    }
  }

  ws['!cols'] = [
    { wch: 5 }, { wch: 5 }, { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 42 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 30 }, { wch: 50 },
  ];

  ws['!autofilter'] = { ref: `A1:S${rows.length}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Divergências');

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  XLSX.writeFile(wb, `divergencias_${sufixo}.xlsx`);
}

// ============================================================
// 3. EXCEL DE IMPORTAÇÃO DO CARTÃO (formato Omie)
// ============================================================

export function gerarExcelImportacaoCartao(resultado: ResultadoConciliacao): void {
  const r = resultado;

  if (!r.cartaoInfo || !r.cartaoTransacoes) {
    console.warn('Sem dados de cartão para gerar importação');
    return;
  }

  const dataVencimento = r.cartaoInfo.vencimento || '';
  const contaCorrente = CATEGORIAS_CONFIG.conta_corrente || 'CARTAO DE CREDITO';

  const valid = r.cartaoTransacoes.filter(t =>
    !t.isPagamentoFatura && !t.isEstorno && !t.matchedNf
  );

  const headers = [
    '', 'Código de Integração',
    'Fornecedor * (Razão Social, Nome Fantasia, CNPJ ou CPF)',
    'Categoria *', 'Conta Corrente *', 'Valor da Conta *',
    'Vendedor', 'Projeto', 'Data de Emissão',
    'Data de Registro *', 'Data de Vencimento *',
    'Data de Previsão', 'Data do Pagamento', 'Valor do Pagamento',
    'Juros', 'Multa', 'Desconto', 'Data de Conciliação', 'Observações',
  ];

  const row1 = ['', 'IMPORTAÇÃO DE CONTAS A PAGAR - OMIE'];
  const row2 = ['', `Fatura Cartão — Venc. ${dataVencimento}`];
  const row3 = ['', `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`];
  const row4: string[] = [];

  const rows: unknown[][] = [row1, row2, row3, row4, headers];

  for (const t of valid) {
    const cat = t.categoriaSugerida || suggestCategoria(t.descricao) || CATEGORIAS_CONFIG.categoria_padrao;
    let obs = t.titular || '';
    if (t.descricao) obs += ` | ${t.descricao.trim()}`;
    if (t.parcela) obs += ` | ${t.parcela}`;

    rows.push([
      '', '', 'CARTAO DE CREDITO', cat, contaCorrente,
      Math.abs(t.valor), '', '', '',
      t.dataStr, dataVencimento, '', dataVencimento,
      Math.abs(t.valor), 0, 0, 0, dataVencimento, obs.trim(),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 3 }, { wch: 18 }, { wch: 45 }, { wch: 40 }, { wch: 22 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 14 }, { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Omie_Contas_Pagar');

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  XLSX.writeFile(wb, `importacao_cartao_${sufixo}.xlsx`);
}

// ============================================================
// 4. RELATÓRIO PDF
// ============================================================

export function gerarRelatorioPDF(resultado: ResultadoConciliacao): void {
  const r = resultado;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 15;

  const azulEscuro: [number, number, number] = [47, 84, 150];
  const vermelho: [number, number, number] = [200, 50, 50];
  const verde: [number, number, number] = [40, 150, 80];

  const checkPage = (needed: number = 30) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 15;
    }
  };

  const fmt = (v: number) => {
    if (v == null || isNaN(v)) return 'R$ 0,00';
    const abs = Math.abs(v);
    const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
  };

  // HEADER
  doc.setFillColor(...azulEscuro);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE CONCILIAÇÃO FINANCEIRA', margin, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`CONCEPT Engenharia — ${r.mesLabel}/${r.anoLabel}`, margin, 22);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 28);
  doc.setTextColor(0, 0, 0);
  y = 40;

  // 1. RESUMO EXECUTIVO
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text('1. RESUMO EXECUTIVO', margin, y);
  y += 8;

  const kpis = [
    { label: 'Conciliados', value: String(r.totalConciliados), color: verde },
    { label: 'Divergências', value: String(r.divergencias.length), color: [200, 150, 30] as [number, number, number] },
    { label: 'Em Atraso', value: String(r.divergencias.filter(d => d.tipo === 'B*').length), color: vermelho },
    { label: 'Cartão Import.', value: String(r.cartaoTransacoes?.filter(t => !t.isPagamentoFatura && !t.isEstorno && !t.matchedNf).length || 0), color: azulEscuro },
  ];

  const cardW = (pageWidth - 2 * margin - 15) / 4;
  kpis.forEach((kpi, i) => {
    const x = margin + i * (cardW + 5);
    doc.setFillColor(...kpi.color);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + cardW / 2, y + 9, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x + cardW / 2, y + 15, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);
  y += 26;

  // Tabela Fontes
  const totalEntradasBanco = r.banco.filter(b => b.valor > 0).reduce((s, b) => s + b.valor, 0);
  const totalSaidasBanco = r.banco.filter(b => b.valor < 0).reduce((s, b) => s + b.valor, 0);
  const totalEntradasOmie = r.omieSicredi.filter(o => o.valor > 0).reduce((s, o) => s + o.valor, 0);
  const totalSaidasOmie = r.omieSicredi.filter(o => o.valor < 0).reduce((s, o) => s + o.valor, 0);

  autoTable(doc, {
    startY: y,
    head: [['Fonte', 'Lançamentos', 'Entradas', 'Saídas', 'Líquido']],
    body: [
      ['Banco (Sicredi)', String(r.banco.length), fmt(totalEntradasBanco), fmt(totalSaidasBanco), fmt(totalEntradasBanco + totalSaidasBanco)],
      ['Omie (Sicredi)', String(r.omieSicredi.length), fmt(totalEntradasOmie), fmt(totalSaidasOmie), fmt(totalEntradasOmie + totalSaidasOmie)],
      ...(r.cartaoInfo ? [['Cartão', `${r.cartaoTransacoes.length} trans.`, '—', fmt(-r.cartaoInfo.valorTotal), '—']] : []),
    ],
    theme: 'grid',
    headStyles: { fillColor: azulEscuro, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
    styles: { cellPadding: 2 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Matching por camada
  checkPage(30);
  autoTable(doc, {
    startY: y,
    head: [['Camada', 'Confiança', 'Qtd']],
    body: [
      ['A', 'ALTA', String(r.camadaCounts['A'] || 0)],
      ['B', 'MÉDIA', String(r.camadaCounts['B'] || 0)],
      ['C', 'MÉDIA (agrupamento)', String(r.camadaCounts['C'] || 0)],
      ['D', 'BAIXA', String(r.camadaCounts['D'] || 0)],
      ['TOTAL', '', String(r.totalConciliados)],
    ],
    theme: 'grid',
    headStyles: { fillColor: azulEscuro, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
    styles: { cellPadding: 2 },
    columnStyles: { 2: { halign: 'center' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // 2. DIVERGÊNCIAS
  checkPage(20);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text('2. DIVERGÊNCIAS', margin, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  const divByTipo: Record<string, Divergencia[]> = {};
  for (const d of r.divergencias) {
    if (!divByTipo[d.tipo]) divByTipo[d.tipo] = [];
    divByTipo[d.tipo].push(d);
  }

  const tipoConfig: [string, string, [number, number, number]][] = [
    ['A', 'Tipo A — Faltando no Omie', [252, 228, 236]],
    ['T', 'Tipo T — Transferências entre contas', [224, 247, 250]],
    ['B*', 'Contas em Atraso', [255, 243, 224]],
    ['B', 'Tipo B — A mais no Omie', [243, 229, 245]],
    ['C', 'Tipo C — Valor divergente', [255, 253, 231]],
    ['E', 'Tipo E — Duplicidades', [243, 229, 245]],
    ['G', 'Tipo G — Previstos não realizados', [239, 235, 233]],
  ];

  for (const [tipo, titulo, cor] of tipoConfig) {
    if (!divByTipo[tipo]?.length) continue;
    const divs = divByTipo[tipo];

    checkPage(25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${titulo} (${divs.length})`, margin, y);
    y += 5;

    const bodyRows = divs.map((d, i) => [
      String(i + 1),
      d.data || '',
      fmt(d.valor),
      (d.descricao || '').substring(0, 45),
      d.cnpjCpf || '',
      d.acao || '',
    ]);

    const totalTipo = divs.reduce((s, d) => s + (d.valor || 0), 0);
    bodyRows.push(['', '', fmt(totalTipo), `${divs.length} itens`, '', '']);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Data', 'Valor', 'Descrição', 'CNPJ/CPF', 'Ação']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: azulEscuro, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: cor },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 55 },
        4: { cellWidth: 30 },
        5: { cellWidth: 38 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // 3. CARTÃO
  if (r.cartaoInfo) {
    checkPage(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...azulEscuro);
    doc.text('3. CARTÃO DE CRÉDITO', margin, y);
    y += 7;
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fatura: Venc. ${r.cartaoInfo.vencimento} | Total: ${fmt(r.cartaoInfo.valorTotal)}`, margin, y);
    y += 6;

    const titularStats: Record<string, { count: number; total: number }> = {};
    for (const t of r.cartaoTransacoes) {
      if (!t.isPagamentoFatura && !t.isEstorno) {
        const tit = t.titular || 'DESCONHECIDO';
        if (!titularStats[tit]) titularStats[tit] = { count: 0, total: 0 };
        titularStats[tit].count++;
        titularStats[tit].total += Math.abs(t.valor);
      }
    }

    if (Object.keys(titularStats).length > 0) {
      const sorted = Object.entries(titularStats).sort((a, b) => b[1].total - a[1].total);
      const totalTit = Object.values(titularStats).reduce((s, v) => s + v.total, 0);
      const countTit = Object.values(titularStats).reduce((s, v) => s + v.count, 0);

      autoTable(doc, {
        startY: y,
        head: [['Titular', 'Transações', 'Total']],
        body: [
          ...sorted.map(([tit, stats]) => [tit, String(stats.count), fmt(stats.total)]),
          ['TOTAL', String(countTit), fmt(totalTit)],
        ],
        theme: 'grid',
        headStyles: { fillColor: azulEscuro, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
        styles: { cellPadding: 2 },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    const validImport = r.cartaoTransacoes.filter(t => !t.isPagamentoFatura && !t.isEstorno && !t.matchedNf);
    const totalImport = validImport.reduce((s, t) => s + Math.abs(t.valor), 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Transações para importar: ${validImport.length} transações, total ${fmt(totalImport)}`, margin, y);
    y += 10;
  }

  // 4. CHECKLIST
  checkPage(40);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text('4. CHECKLIST DE FECHAMENTO', margin, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  const divCounts: Record<string, number> = {};
  for (const d of r.divergencias) {
    divCounts[d.tipo] = (divCounts[d.tipo] || 0) + 1;
  }

  const checkItems: string[] = [];
  if (divCounts['A']) {
    const totalA = r.divergencias.filter(d => d.tipo === 'A').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push(`☐ FALTANDO: ${divCounts['A']} lançamentos faltando no Omie, total ${fmt(totalA)}`);
  }
  if (divCounts['T']) {
    checkItems.push(`☐ TRANSFERÊNCIAS: ${divCounts['T']} transferências entre contas para lançar`);
  }
  if (divCounts['B*']) {
    const totalAtraso = r.divergencias.filter(d => d.tipo === 'B*').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push(`☐ ATRASO: ${divCounts['B*']} contas em atraso, total ${fmt(totalAtraso)} — cobrar/verificar`);
  }
  if (divCounts['B']) {
    const totalB = r.divergencias.filter(d => d.tipo === 'B').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push(`☐ A MAIS: ${divCounts['B']} a mais no Omie, total ${fmt(totalB)} — investigar`);
  }
  if (divCounts['C']) checkItems.push(`☐ VALORES: ${divCounts['C']} com valor divergente — corrigir`);
  if (divCounts['E']) checkItems.push(`☐ DUPLICIDADES: ${divCounts['E']} duplicatas no Omie — remover`);

  const validImportCheck = r.cartaoTransacoes?.filter(t => !t.isPagamentoFatura && !t.isEstorno && !t.matchedNf) || [];
  if (validImportCheck.length > 0) {
    const totalImportCheck = validImportCheck.reduce((s, t) => s + Math.abs(t.valor), 0);
    checkItems.push(`☐ CARTÃO: Importar planilha com ${validImportCheck.length} despesas, total ${fmt(totalImportCheck)}`);
  }

  if ((r.camadaCounts['D'] || 0) > 0) {
    checkItems.push(`☐ REVISAR: ${r.camadaCounts['D']} matches com baixa confiança`);
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  for (const item of checkItems) {
    checkPage(8);
    doc.text(item, margin + 2, y);
    y += 6;
  }

  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text(`Relatório gerado automaticamente — Conciliação Financeira CONCEPT Engenharia — ${new Date().toLocaleDateString('pt-BR')}`, margin, y);

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  doc.save(`relatorio_conciliacao_${sufixo}.pdf`);
}
