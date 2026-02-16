import { matchCamadaA, matchCamadaB, matchCamadaC, matchCamadaD, matchFaturaCartao } from './matcher';
import { detectDuplicates, classifyDivergencias } from './classifier';
import { parseBanco, parseOmie, parseCartaoFromText, workbookToRows, csvToText } from './parsers';
import { suggestCategoria } from './categorias';
import type { LancamentoBanco, TransacaoCartao, CartaoInfo, Match, Divergencia, ResultadoConciliacao } from './types';

export async function executarConciliacao(
  bancoFile: File,
  omieFile: File,
  cartaoFile: File | null
): Promise<ResultadoConciliacao> {

  // 1. Parse dos arquivos
  const bancoRows = await workbookToRows(bancoFile);
  const { lancamentos: banco, saldoAnterior: saldoBanco } = parseBanco(bancoRows);

  const omieRows = await workbookToRows(omieFile);
  const { lancamentos: omie, saldoAnterior: saldoOmie } = parseOmie(omieRows);

  let cartaoTransacoes: TransacaoCartao[] = [];
  let cartaoInfo: CartaoInfo = { vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 };

  if (cartaoFile) {
    const fileName = cartaoFile.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      const text = await csvToText(cartaoFile);
      const result = parseCartaoFromText(text);
      cartaoTransacoes = result.transacoes;
      cartaoInfo = result.info;
    } else {
      const rows = await workbookToRows(cartaoFile);
      const text = rows.map(r => (r || []).join(';')).join('\n');
      const result = parseCartaoFromText(text);
      cartaoTransacoes = result.transacoes;
      cartaoInfo = result.info;
    }
  }

  // === DIAGNÓSTICO BANCO ===
  console.log('=== DIAGNÓSTICO BANCO ===');
  console.log('Total lançamentos banco:', banco.length);
  const bancoComCnpj = banco.filter(b => b.cnpjCpf && b.cnpjCpf.length > 0);
  console.log('Banco com CNPJ:', bancoComCnpj.length);
  if (banco.length > 0) {
    console.log('Amostra banco[0]:', JSON.stringify({ desc: banco[0].descricao, cnpj: banco[0].cnpjCpf, nome: banco[0].nome, tipo: banco[0].tipo, valor: banco[0].valor, data: banco[0].dataStr }));
  }

  // === DIAGNÓSTICO OMIE ===
  console.log('=== DIAGNÓSTICO OMIE ===');
  console.log('Total lançamentos Omie:', omie.length);

  // Sugestão de categoria para cartão
  for (const t of cartaoTransacoes) {
    if (!t.isPagamentoFatura && !t.isEstorno) {
      t.categoriaSugerida = suggestCategoria(t.descricao);
    }
  }

  // 2. Executar matching em camadas
  const matches: Match[] = [];
  const divergencias: Divergencia[] = [];

  matchCamadaA(banco, omie, matches);
  console.log('=== APÓS CAMADA A === Matches:', matches.length);

  matchCamadaB(banco, omie, matches);
  console.log('=== APÓS CAMADA B === Matches:', matches.length);

  matchCamadaC(banco, omie, matches);
  console.log('=== APÓS CAMADA C === Matches:', matches.length);

  matchCamadaD(banco, omie, matches);
  console.log('=== APÓS CAMADA D === Matches:', matches.length);

  matchFaturaCartao(banco, omie, matches);

  // 3. Detectar duplicidades
  detectDuplicates(omie, divergencias);

  // 4. Classificar divergências
  classifyDivergencias(banco, omie, cartaoTransacoes, divergencias, matches);

  // 7. Calcular métricas
  const camadaCounts: Record<string, number> = {};
  for (const m of matches) {
    camadaCounts[m.camada] = (camadaCounts[m.camada] || 0) + 1;
  }

  const divCounts: Record<string, number> = {};
  for (const d of divergencias) {
    divCounts[d.tipo] = (divCounts[d.tipo] || 0) + 1;
  }

  const contasAtraso = divergencias.filter(d => d.tipo === 'B*').length;
  const cartaoImportaveis = divergencias.filter(d => d.tipo === 'I').length;

  // 8. Detectar mês/ano
  const mesAno = detectarMesAno(banco);

  return {
    matches,
    divergencias,
    banco,
    omieSicredi: omie,
    cartaoTransacoes,
    cartaoInfo,
    saldoBanco,
    saldoOmie,
    camadaCounts,
    divCounts,
    totalConciliados: matches.length,
    totalDivergencias: divergencias.length,
    contasAtraso,
    cartaoImportaveis,
    mesLabel: mesAno.mesLabel,
    anoLabel: mesAno.anoLabel,
  };
}

function detectarMesAno(banco: LancamentoBanco[]): { mesLabel: string; anoLabel: string } {
  const mesesFull = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  if (!banco.length) {
    const now = new Date();
    return { mesLabel: mesesFull[now.getMonth()], anoLabel: String(now.getFullYear()) };
  }

  const counts = new Map<string, number>();
  for (const b of banco) {
    const key = `${b.data.getMonth()}-${b.data.getFullYear()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let bestKey = '';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) { bestKey = key; bestCount = count; }
  }

  if (bestKey) {
    const [month, year] = bestKey.split('-');
    return { mesLabel: mesesFull[parseInt(month)], anoLabel: year };
  }

  const now = new Date();
  return { mesLabel: mesesFull[now.getMonth()], anoLabel: String(now.getFullYear()) };
}
