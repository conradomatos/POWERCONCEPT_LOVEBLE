import { normalizeCnpjCpf, nomeCompativel, nomeCompativelCartao, daysDiff } from './utils';
import { suggestCategoria } from './categorias';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, Match } from './types';

function markMatch(b: LancamentoBanco, o: LancamentoOmie, camada: string, tipo: string, matches: Match[]) {
  b.matched = true;
  b.matchType = tipo;
  b.matchCamada = camada;
  b.matchOmieIdx = o.idx;

  o.matched = true;
  o.matchType = tipo;
  o.matchCamada = camada;
  o.matchBancoIdx = b.idx;

  matches.push({ camada, tipo, banco: b, omie: o });
}

// ============================================================
// CAMADA A — Match exato (confiança ALTA)
// ============================================================
export function matchCamadaA(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.matched) continue;
    const bCnpj = normalizeCnpjCpf(b.cnpjCpf);

    for (const o of omie) {
      if (o.matched) continue;
      const oCnpj = normalizeCnpjCpf(o.cnpjCpf);

      if (bCnpj && oCnpj && bCnpj === oCnpj) {
        if (Math.abs(b.valor - o.valor) < 0.01) {
          if (daysDiff(b.data, o.data) <= 1) {
            markMatch(b, o, 'A', 'CNPJ+Valor+Data', matches);
            break;
          }
        }
      }

      if (o.observacoes && Math.abs(b.valor - o.valor) < 0.01) {
        const obsUpper = o.observacoes.toUpperCase().replace(/\n/g, ' ');
        const descParts = b.descricao.toUpperCase().split(/\s+/);
        const keyParts = descParts.filter(p => p.length > 3);
        if (keyParts.length >= 3) {
          const matchCount = keyParts.filter(p => obsUpper.includes(p)).length;
          if (matchCount >= Math.min(3, keyParts.length)) {
            if (daysDiff(b.data, o.data) <= 3) {
              markMatch(b, o, 'A', 'Observações+Valor', matches);
              break;
            }
          }
        }
        if (bCnpj && normalizeCnpjCpf(obsUpper.replace(/\./g, '').replace(/\//g, '').replace(/-/g, '')).includes(bCnpj)) {
          if (daysDiff(b.data, o.data) <= 3) {
            markMatch(b, o, 'A', 'CNPJ_obs+Valor', matches);
            break;
          }
        }
      }
    }
  }
}

// ============================================================
// CAMADA B — Match provável (confiança MÉDIA)
// ============================================================
export function matchCamadaB(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.matched) continue;
    const bCnpj = normalizeCnpjCpf(b.cnpjCpf);

    for (const o of omie) {
      if (o.matched) continue;
      const oCnpj = normalizeCnpjCpf(o.cnpjCpf);

      if (Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 3) {
        if (nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial)) {
          markMatch(b, o, 'B', 'Valor+Data+Nome', matches);
          break;
        }
      }

      if (bCnpj && oCnpj && bCnpj === oCnpj && daysDiff(b.data, o.data) <= 5) {
        if (b.valor !== 0 && Math.abs(b.valor - o.valor) / Math.abs(b.valor) < 0.05) {
          markMatch(b, o, 'B', 'CNPJ+Data+ValorProx', matches);
          break;
        }
      }

      if (bCnpj && oCnpj && bCnpj === oCnpj && Math.abs(b.valor - o.valor) < 0.01) {
        if (daysDiff(b.data, o.data) <= 5) {
          markMatch(b, o, 'B', 'CNPJ+Valor+DataProx', matches);
          break;
        }
      }

      if (o.observacoes && Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 5) {
        const obsNorm = o.observacoes.toUpperCase().replace(/\n/g, ' ');
        if (bCnpj && obsNorm.replace(/\D/g, '').includes(bCnpj)) {
          markMatch(b, o, 'B', 'CNPJ_obs_parcial+Valor', matches);
          break;
        }
      }
    }
  }
}

// ============================================================
// CAMADA B2 — Match B adicional
// ============================================================
function matchCamadaB2(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.matched) continue;
    for (const o of omie) {
      if (o.matched) continue;
      if (Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 5) {
        if (nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial)) {
          markMatch(b, o, 'B', 'Valor+DataProx+Nome', matches);
          break;
        }
      }
    }
  }
}

// ============================================================
// CAMADA C — Match por agrupamento (confiança MÉDIA)
// ============================================================
export function matchCamadaC(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  const unmatchedOmie = omie.filter(o => !o.matched);

  for (const b of banco) {
    if (b.matched) continue;
    const bCnpj = normalizeCnpjCpf(b.cnpjCpf);
    if (!bCnpj) continue;

    const candidates = unmatchedOmie.filter(o =>
      !o.matched &&
      normalizeCnpjCpf(o.cnpjCpf) === bCnpj &&
      daysDiff(b.data, o.data) <= 5
    );

    if (candidates.length >= 2) {
      const total = candidates.reduce((sum, c) => sum + c.valor, 0);
      if (Math.abs(total - b.valor) < 0.01) {
        for (const c of candidates) {
          markMatch(b, c, 'C', `Agrupamento(${candidates.length})`, matches);
        }
        break;
      }
    }
  }

  for (const b of banco) {
    if (b.matched || b.tipo !== 'FOLHA') continue;
    const candidates = unmatchedOmie.filter(o =>
      !o.matched &&
      daysDiff(b.data, o.data) <= 2 &&
      /FOPAG|FOLHA|SALARIO|SALÁRIO/i.test(o.categoria)
    );
    if (candidates.length) {
      const total = candidates.reduce((sum, c) => sum + c.valor, 0);
      if (Math.abs(total - b.valor) < 0.01) {
        for (const c of candidates) {
          markMatch(b, c, 'C', `FOLHA_Agrupamento(${candidates.length})`, matches);
        }
      }
    }
  }
}

// ============================================================
// CAMADA D — Match fraco (confiança BAIXA) com scoring
// ============================================================
export function matchCamadaD(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  matchCamadaB2(banco, omie, matches);

  for (const b of banco) {
    if (b.matched) continue;

    let bestCandidate: LancamentoOmie | null = null;
    let bestScore = 0;

    for (const o of omie) {
      if (o.matched) continue;
      let score = 0;

      if (Math.abs(b.valor - o.valor) < 0.01) score += 3;
      else if (b.valor !== 0 && Math.abs(b.valor - o.valor) / Math.abs(b.valor) < 0.05) score += 1;

      const dd = daysDiff(b.data, o.data);
      if (dd <= 1) score += 2;
      else if (dd <= 3) score += 1;

      if (nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial)) score += 2;

      const bCnpj = normalizeCnpjCpf(b.cnpjCpf);
      const oCnpj = normalizeCnpjCpf(o.cnpjCpf);
      if (bCnpj && oCnpj && bCnpj === oCnpj) score += 3;

      if (score > bestScore && score >= 3) {
        bestScore = score;
        bestCandidate = o;
      }
    }

    if (bestCandidate && bestScore >= 4) {
      const valorMatch = Math.abs(b.valor - bestCandidate.valor) < 0.01;
      const dataMatch = daysDiff(b.data, bestCandidate.data) <= 3;

      let tipo = `Score=${bestScore}`;
      if (valorMatch && !dataMatch) tipo = 'Valor+Nome(DataDiv)';
      else if (!valorMatch && dataMatch) tipo = 'Data+Nome(ValorDiv)';

      markMatch(b, bestCandidate, 'D', tipo, matches);
    }
  }
}

// ============================================================
// MATCH FATURA CARTÃO
// ============================================================
export function matchFaturaCartao(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.tipo !== 'FATURA_CARTAO') continue;
    if (b.matched) continue;

    for (const o of omie) {
      if (o.matched) continue;
      const isCartao = o.clienteFornecedor.toUpperCase().includes('CARTAO DE CREDITO') ||
                       o.categoria.toUpperCase().includes('CARTAO DE CREDITO') ||
                       o.origem.includes('Saída de Transferência') ||
                       o.origem.includes('Débito de Transferência');

      if (isCartao && o.contaCorrente === 'CONCEPT_SICREDI') {
        if (Math.abs(b.valor - o.valor) < 0.01) {
          markMatch(b, o, 'A', 'FATURA_CARTAO', matches);
          break;
        }
      }
    }
  }
}

// ============================================================
// MATCH CARTÃO ↔ NF
// ============================================================
export function matchCartaoNf(cartao: TransacaoCartao[], omieCartao: LancamentoOmie[]) {
  for (const t of cartao) {
    if (t.isPagamentoFatura || t.isEstorno) continue;
    for (const o of omieCartao) {
      if (o.matched) continue;
      if (o.origem.includes('Transferência') || o.categoria.includes('Transferência')) continue;

      if (Math.abs(Math.abs(o.valor) - Math.abs(t.valor)) < 0.01) {
        if (nomeCompativelCartao(t.descricao, o.clienteFornecedor, o.razaoSocial)) {
          t.matchedNf = true;
          t.matchOmieIdx = o.idx;
          t.matchFornecedorOmie = o.clienteFornecedor;
          t.matchTipoDoc = o.tipoDoc;
          t.matchNf = o.notaFiscal;
          o.matched = true;
          break;
        }
      }
    }
  }

  for (const t of cartao) {
    if (t.matchedNf || t.isPagamentoFatura || t.isEstorno) continue;
    for (const o of omieCartao) {
      if (o.matched) continue;
      if (o.origem.includes('Transferência') || o.categoria.includes('Transferência')) continue;

      if (Math.abs(Math.abs(o.valor) - Math.abs(t.valor)) < 0.01) {
        t.matchedNf = true;
        t.matchOmieIdx = o.idx;
        t.matchFornecedorOmie = o.clienteFornecedor;
        t.matchTipoDoc = o.tipoDoc;
        t.matchNf = o.notaFiscal;
        o.matched = true;
        break;
      }
    }
  }

  for (const t of cartao) {
    if (!t.matchedNf && !t.isPagamentoFatura && !t.isEstorno) {
      t.categoriaSugerida = suggestCategoria(t.descricao);
    }
  }
}
