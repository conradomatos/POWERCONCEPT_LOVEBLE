import { normalizeCnpjCpf, daysDiff } from './utils';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, Match, Divergencia } from './types';

// ============================================================
// DETECTAR DUPLICIDADES (tipo E)
// ============================================================
export function detectDuplicates(omie: LancamentoOmie[], divergencias: Divergencia[]) {
  const groups = new Map<string, LancamentoOmie[]>();

  for (const o of omie) {
    const key = `${normalizeCnpjCpf(o.cnpjCpf)}|${o.valor.toFixed(2)}|${o.data.toISOString().slice(0,10)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  for (const [, entries] of groups) {
    if (entries.length < 2) continue;
    const matched = entries.filter(e => e.matched);
    const unmatched = entries.filter(e => !e.matched);

    if (matched.length && unmatched.length) {
      for (const u of unmatched) {
        u.matched = true;
        u.matchType = 'DUPLICIDADE';
        divergencias.push({
          tipo: 'E',
          tipoNome: 'DUPLICIDADE',
          fonte: 'Omie',
          data: u.dataStr,
          valor: u.valor,
          descricao: u.clienteFornecedor,
          cnpjCpf: u.cnpjCpf,
          nome: u.clienteFornecedor,
          situacao: u.situacao,
          origem: u.origem,
          banco: null,
          omie: u,
        });
      }
    }
  }
}

// ============================================================
// CLASSIFICAR TODAS AS DIVERGÊNCIAS
// ============================================================
export function classifyDivergencias(
  banco: LancamentoBanco[],
  omieSicredi: LancamentoOmie[],
  omieCartao: LancamentoOmie[],
  cartao: TransacaoCartao[],
  divergencias: Divergencia[],
  matches: Match[]
) {
  // A — FALTANDO NO OMIE
  for (const b of banco) {
    if (!b.matched) {
      divergencias.push({
        tipo: 'A',
        tipoNome: 'FALTANDO NO OMIE',
        fonte: 'Banco',
        data: b.dataStr,
        valor: b.valor,
        descricao: b.descricao,
        cnpjCpf: b.cnpjCpf,
        nome: b.nome,
        banco: b,
        omie: null,
      });
    }
  }

  // B / B* — A MAIS NO OMIE / CONTA EM ATRASO
  for (const o of omieSicredi) {
    if (o.matched) continue;

    if (o.situacao === 'Atrasado' && o.origem.includes('Previsão')) {
      divergencias.push({
        tipo: 'G',
        tipoNome: 'PREVISTO – NÃO REALIZADO',
        fonte: 'Omie',
        data: o.dataStr,
        valor: o.valor,
        descricao: o.clienteFornecedor,
        cnpjCpf: o.cnpjCpf,
        nome: o.clienteFornecedor,
        banco: null,
        omie: o,
      });
      continue;
    }

    const isAtrasado = o.situacao.toLowerCase() === 'atrasado';
    const tipoDivergencia = isAtrasado ? 'B*' : 'B';
    const tipoNome = isAtrasado ? 'CONTA EM ATRASO' : 'A MAIS NO OMIE';

    let acao = 'Investigar';
    if (isAtrasado) {
      acao = o.origem.toLowerCase().includes('receber')
        ? 'Conta a receber em atraso — cobrar cliente'
        : 'Conta a pagar em atraso — verificar pagamento';
    }

    divergencias.push({
      tipo: tipoDivergencia,
      tipoNome,
      fonte: 'Omie',
      data: o.dataStr,
      valor: o.valor,
      descricao: o.clienteFornecedor,
      cnpjCpf: o.cnpjCpf,
      nome: o.clienteFornecedor,
      situacao: o.situacao,
      origem: o.origem,
      acao,
      banco: null,
      omie: o,
    });
  }

  // C / D — VALOR/DATA DIVERGENTE nos matches
  for (const m of matches) {
    const b = m.banco;
    const o = m.omie;

    if (Math.abs(b.valor - o.valor) >= 0.01) {
      divergencias.push({
        tipo: 'C',
        tipoNome: 'VALOR DIVERGENTE',
        fonte: 'Ambos',
        data: b.dataStr,
        valor: b.valor,
        valorBanco: b.valor,
        valorOmie: o.valor,
        diferenca: b.valor - o.valor,
        descricao: b.descricao,
        cnpjCpf: b.cnpjCpf,
        nome: o.clienteFornecedor,
        banco: b,
        omie: o,
      });
    }

    const dd = daysDiff(b.data, o.data);
    if (dd > 3 && Math.abs(b.valor - o.valor) < 0.01) {
      divergencias.push({
        tipo: 'D',
        tipoNome: 'DATA DIVERGENTE',
        fonte: 'Ambos',
        data: b.dataStr,
        dataBanco: b.dataStr,
        dataOmie: o.dataStr,
        valor: b.valor,
        diasDiferenca: dd,
        descricao: b.descricao,
        cnpjCpf: b.cnpjCpf,
        nome: o.clienteFornecedor,
        banco: b,
        omie: o,
      });
    }
  }

  // H — CARTÃO COBERTO POR NF
  for (const t of cartao) {
    if (t.matchedNf) {
      divergencias.push({
        tipo: 'H',
        tipoNome: 'CARTÃO - COBERTO POR NF',
        fonte: 'Cartão',
        data: t.dataStr,
        valor: t.valor,
        descricao: t.descricao,
        titular: t.titular,
        fornecedorOmie: t.matchFornecedorOmie,
        tipoDoc: t.matchTipoDoc,
        nf: t.matchNf,
      });
    }
  }

  // I — CARTÃO FALTANDO NO OMIE (para importar)
  for (const t of cartao) {
    if (!t.matchedNf && !t.isPagamentoFatura && !t.isEstorno) {
      divergencias.push({
        tipo: 'I',
        tipoNome: 'CARTÃO - FALTANDO NO OMIE',
        fonte: 'Cartão',
        data: t.dataStr,
        valor: t.valor,
        descricao: t.descricao,
        titular: t.titular,
        categoriaSugerida: t.categoriaSugerida,
        parcela: t.parcela,
      });
    }
  }

  divergencias.sort((a, b) => Math.abs(b.valor || 0) - Math.abs(a.valor || 0));
}
