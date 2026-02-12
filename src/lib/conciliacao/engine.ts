import { matchCamadaA, matchCamadaB, matchCamadaC, matchCamadaD, matchFaturaCartao, matchCartaoNf } from './matcher';
import { detectDuplicates, classifyDivergencias } from './classifier';
import { parseBanco, parseOmie, parseCartaoFromText, workbookToRows, csvToText } from './parsers';
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
    if (banco[5]) console.log('Amostra banco[5]:', JSON.stringify({ desc: banco[5].descricao, cnpj: banco[5].cnpjCpf, nome: banco[5].nome, tipo: banco[5].tipo }));
  }

  // === DIAGNÓSTICO OMIE ===
  console.log('=== DIAGNÓSTICO OMIE ===');
  console.log('Total lançamentos Omie:', omie.length);
  const omieComCnpj = omie.filter(o => o.cnpjCpf && o.cnpjCpf.length > 0);
  console.log('Omie com CNPJ:', omieComCnpj.length);
  const contas = [...new Set(omie.map(o => o.contaCorrente))];
  console.log('Contas encontradas no Omie:', contas);
  if (omie.length > 0) {
    console.log('Amostra omie[0]:', JSON.stringify({ cliente: omie[0].clienteFornecedor, cnpj: omie[0].cnpjCpf, valor: omie[0].valor, conta: omie[0].contaCorrente, obs: omie[0].observacoes?.substring(0, 100), situacao: omie[0].situacao }));
  }

  // 2. Separar Omie por conta corrente (filtro flexível)
  const contaCartaoKeywords = ['CARTAO', 'CARTÃO', 'CREDIT CARD'];
  const omieSicredi = omie.filter(o =>
    !contaCartaoKeywords.some(k => o.contaCorrente.toUpperCase().includes(k))
  );
  const omieCartao = omie.filter(o =>
    contaCartaoKeywords.some(k => o.contaCorrente.toUpperCase().includes(k))
  );
  console.log('Omie Sicredi:', omieSicredi.length, 'Omie Cartão:', omieCartao.length);

  // 3. Executar matching em camadas
  const matches: Match[] = [];
  const divergencias: Divergencia[] = [];

  matchCamadaA(banco, omieSicredi, matches);
  console.log('=== APÓS CAMADA A === Matches:', matches.length, 'Banco matched:', banco.filter(b => b.matched).length);

  matchCamadaB(banco, omieSicredi, matches);
  console.log('=== APÓS CAMADA B === Matches:', matches.length, 'Banco matched:', banco.filter(b => b.matched).length);

  matchCamadaC(banco, omieSicredi, matches);
  console.log('=== APÓS CAMADA C === Matches:', matches.length);

  matchCamadaD(banco, omieSicredi, matches);
  console.log('=== APÓS CAMADA D === Matches:', matches.length);

  matchFaturaCartao(banco, omie, matches);

  // 4. Conciliação do cartão
  if (cartaoTransacoes.length > 0) {
    matchCartaoNf(cartaoTransacoes, omieCartao);
  }

  // 5. Detectar duplicidades
  detectDuplicates(omieSicredi, divergencias);

  // 6. Classificar divergências
  classifyDivergencias(banco, omieSicredi, omieCartao, cartaoTransacoes, divergencias, matches);

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
    omieSicredi,
    omieCartao,
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
