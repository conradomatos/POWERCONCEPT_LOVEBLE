import * as XLSX from 'xlsx';
import { extractCnpjCpf, extractNomeBanco, classifyBanco, parseDate, parseValorBRL } from './utils';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, CartaoInfo } from './types';

// ============================================================
// PARSER BANCO SICREDI (XLS/XLSX)
// ============================================================
export function parseBanco(rows: any[][]): { lancamentos: LancamentoBanco[], saldoAnterior: number | null } {
  let saldoAnterior: number | null = null;
  if (rows.length > 9 && rows[9] && rows[9][4] != null) {
    saldoAnterior = parseFloat(rows[9][4]) || null;
  }

  const lancamentos: LancamentoBanco[] = [];

  for (let i = 10; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || !row[1]) continue;

    const dataStr = String(row[0]).trim();

    if (dataStr.includes('Saldo') || dataStr.includes('Lançamentos Futuros') ||
        dataStr.includes('Vencimento') || dataStr.includes('Custo')) break;

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) continue;

    const desc = String(row[1]).trim();
    const doc = row[2] != null ? String(row[2]).trim() : '';
    const valor = row[3] != null ? parseFloat(row[3]) : 0;
    const saldo = row[4] != null ? parseFloat(row[4]) : null;

    lancamentos.push({
      idx: i,
      data: parseDate(dataStr)!,
      dataStr,
      descricao: desc,
      documento: doc,
      valor,
      saldo,
      cnpjCpf: extractCnpjCpf(desc),
      nome: extractNomeBanco(desc),
      tipo: classifyBanco(desc),
      matched: false,
      matchType: null,
      matchCamada: null,
      matchOmieIdx: null,
    });
  }

  return { lancamentos, saldoAnterior };
}

// ============================================================
// PARSER OMIE (XLSX)
// ============================================================
export function parseOmie(rows: any[][]): { lancamentos: LancamentoOmie[], saldoAnterior: number | null } {
  let saldoAnterior: number | null = null;
  const lancamentos: LancamentoOmie[] = [];

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const cliente = row[2] != null ? String(row[2]) : '';

    if (cliente.toUpperCase().includes('SALDO')) {
      if ((cliente.toUpperCase().includes('ANTERIOR') || cliente.toUpperCase().includes('INICIAL')) && saldoAnterior === null) {
        saldoAnterior = row[6] != null ? parseFloat(row[6]) : null;
      }
      continue;
    }

    const situacao = row[0] != null ? String(row[0]).trim() : '';
    if (!situacao) continue;

    const dataVal = row[1];
    const data = parseDate(dataVal);
    if (!data) continue;

    const valor = row[5] != null ? parseFloat(row[5]) : 0;
    const contaCorrente = row[3] != null ? String(row[3]) : '';
    const categoria = row[4] != null ? String(row[4]) : '';
    const tipoDoc = row[9] != null ? String(row[9]) : '';
    const documento = row[10] != null ? String(row[10]) : '';
    const notaFiscal = row[11] != null ? String(row[11]) : '';
    const parcela = row[12] != null ? String(row[12]) : '';
    const origem = row[14] != null ? String(row[14]) : '';
    const projeto = row[17] != null ? String(row[17]) : '';
    const razaoSocial = row[18] != null ? String(row[18]) : '';
    const cnpjCpf = row[19] != null ? String(row[19]) : '';
    const observacoes = row[20] != null ? String(row[20]) : '';

    lancamentos.push({
      idx: i,
      situacao,
      data,
      dataStr: data.toLocaleDateString('pt-BR'),
      clienteFornecedor: cliente,
      contaCorrente,
      categoria,
      valor,
      tipoDoc,
      documento,
      notaFiscal,
      parcela,
      origem,
      projeto,
      razaoSocial,
      cnpjCpf,
      observacoes,
      matched: false,
      matchType: null,
      matchCamada: null,
      matchBancoIdx: null,
    });
  }

  return { lancamentos, saldoAnterior };
}

// ============================================================
// PARSER CARTÃO SICREDI (CSV)
// ============================================================
export function parseCartaoFromText(text: string): { transacoes: TransacaoCartao[], info: CartaoInfo } {
  const lines = text.split('\n');

  let vencimento = '';
  let valorTotal = 0;
  let situacao = '';
  let despesasBrasil = 0;
  let despesasExterior = 0;
  let pagamentos = 0;

  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const parts = lines[i].split(';');
    const label = (parts[0] || '').trim();
    const val = (parts[1] || '').trim();

    if (label.includes('Data de Vencimento')) vencimento = val;
    else if (label.includes('Valor Total')) valorTotal = parseValorBRL(val);
    else if (label.includes('Situa')) situacao = val;
    else if (label.includes('Despesas / Debitos no Brasil')) despesasBrasil = parseValorBRL(val);
    else if (label.includes('Despesas / Debitos no exterior')) despesasExterior = parseValorBRL(val);
    else if (label.includes('Pagamentos / Creditos')) pagamentos = parseValorBRL(val);
  }

  const transacoes: TransacaoCartao[] = [];
  let currentTitular = '';
  let currentCartao = '';

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(';');

    if (parts.length >= 3 && parts[0].includes('Cart') && parts[1].includes('XXXX')) {
      currentCartao = parts[1].trim();
      currentTitular = parts[2].trim();
      continue;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test((parts[0] || '').trim())) {
      const dataStr = parts[0].trim();
      const descricao = (parts[1] || '').trim();
      const parcela = (parts[2] || '').trim();
      const valorStr = (parts[3] || '').trim();

      if (dataStr.includes('Data') && descricao.includes('Descri')) continue;

      const valor = parseValorBRL(valorStr);
      const data = parseDate(dataStr);
      if (!data) continue;

      transacoes.push({
        data,
        dataStr,
        descricao,
        parcela,
        valor,
        titular: currentTitular,
        cartao: currentCartao,
        isPagamentoFatura: descricao.includes('Pag Fat Deb Cc'),
        isEstorno: valor < 0 && !descricao.includes('Pag Fat'),
        matchedNf: false,
        matchOmieIdx: null,
        matchFornecedorOmie: '',
        matchTipoDoc: '',
        matchNf: '',
        categoriaSugerida: '',
      });
    }
  }

  return {
    transacoes,
    info: { vencimento, valorTotal, situacao, despesasBrasil, despesasExterior, pagamentos }
  };
}

// ============================================================
// HELPERS
// ============================================================
export function workbookToRows(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function csvToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}
