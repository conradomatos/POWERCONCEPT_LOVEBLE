import * as XLSX from 'xlsx';
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
  downloadFile(lines.join('\n'), `relatorio_conciliacao_${sufixo}.md`, 'text/markdown;charset=utf-8');
}

// ============================================================
// 2. EXCEL DE DIVERGÊNCIAS
// ============================================================

export function gerarExcelDivergencias(resultado: ResultadoConciliacao): void {
  const r = resultado;

  const tipoDescricoes: Record<string, string> = {
    'A': 'FALTANDO NO OMIE',
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
    'Titular Cartão', 'Categoria Sugerida', 'NF', 'Ação Sugerida'
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
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 5 }, { wch: 5 }, { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 42 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 30 },
  ];

  ws['!autofilter'] = { ref: `A1:R${rows.length}` };

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
    if (t.parcela) obs += ` - ${t.parcela}`;

    rows.push([
      '', '', t.descricao.trim(), cat, contaCorrente,
      Math.abs(t.valor), '', '', '',
      t.dataStr, dataVencimento, '', dataVencimento,
      Math.abs(t.valor), '', '', '', dataVencimento, obs.trim(),
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
