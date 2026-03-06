/**
 * Módulo de Rateio Proporcional de Horas
 *
 * Distribui horas do Secullum (horas_base_dia) proporcionalmente
 * entre os projetos apontados pelo colaborador naquele dia.
 *
 * Exemplo:
 *   8h normais + 1h extra 50%, distribuídas 6h proj A + 3h proj B:
 *   - A: 5.33h normais + 0.67h extra 50%
 *   - B: 2.67h normais + 0.33h extra 50%
 *
 * Fórmula: horas_tipo_projeto = horas_tipo_total × (horas_apontadas_projeto / total_apontado)
 */

/** Entrada: horas por tipo vindas do Secullum */
export interface HorasPorTipo {
  horas_normais: number;
  horas_extra_50: number;
  horas_extra_100: number;
  horas_extra_0: number;
  horas_noturnas: number;
  horas_extra_noturna: number;
}

/** Entrada do rateio */
export interface RateioInput {
  /** Horas base do dia (total Secullum) */
  horasBase: number;
  /** Horas por tipo para distribuição detalhada */
  horasPorTipo?: HorasPorTipo;
  /** Projetos com horas apontadas */
  apontamentos: Array<{
    projetoId: string;
    horasApontadas: number;
  }>;
}

/** Saída do rateio por projeto */
export interface RateioOutput {
  projetoId: string;
  horasOriginais: number;
  horasRateadas: number;
  percentual: number;
  /** Detalhamento por tipo de hora (se horasPorTipo fornecido) */
  detalhamento?: {
    horas_normais: number;
    horas_extra_50: number;
    horas_extra_100: number;
    horas_extra_0: number;
    horas_noturnas: number;
    horas_extra_noturna: number;
  };
}

/** Resultado da validação de distribuição */
export interface ValidacaoDistribuicao {
  valido: boolean;
  saldo: number;
  mensagem?: string;
}

/**
 * Calcula o rateio proporcional de horas entre projetos.
 *
 * @param input Dados de entrada com horasBase e apontamentos
 * @returns Array com horas rateadas por projeto
 *
 * @example
 * calcularRateio({
 *   horasBase: 9,
 *   horasPorTipo: { horas_normais: 8, horas_extra_50: 1, ... },
 *   apontamentos: [
 *     { projetoId: 'a', horasApontadas: 6 },
 *     { projetoId: 'b', horasApontadas: 3 },
 *   ]
 * })
 * // → [
 * //   { projetoId: 'a', horasRateadas: 6, percentual: 66.67, detalhamento: { horas_normais: 5.33, horas_extra_50: 0.67, ... } },
 * //   { projetoId: 'b', horasRateadas: 3, percentual: 33.33, detalhamento: { horas_normais: 2.67, horas_extra_50: 0.33, ... } },
 * // ]
 */
export function calcularRateio(input: RateioInput): RateioOutput[] {
  const { horasBase, horasPorTipo, apontamentos } = input;

  const totalApontado = apontamentos.reduce((sum, a) => sum + a.horasApontadas, 0);

  if (totalApontado === 0 || apontamentos.length === 0) {
    return [];
  }

  const resultados: RateioOutput[] = apontamentos.map((apt) => {
    const percentual = (apt.horasApontadas / totalApontado) * 100;
    const horasRateadas = round2(horasBase * (apt.horasApontadas / totalApontado));

    const item: RateioOutput = {
      projetoId: apt.projetoId,
      horasOriginais: apt.horasApontadas,
      horasRateadas,
      percentual: round2(percentual),
    };

    if (horasPorTipo) {
      const frac = apt.horasApontadas / totalApontado;
      item.detalhamento = {
        horas_normais: round2(horasPorTipo.horas_normais * frac),
        horas_extra_50: round2(horasPorTipo.horas_extra_50 * frac),
        horas_extra_100: round2(horasPorTipo.horas_extra_100 * frac),
        horas_extra_0: round2(horasPorTipo.horas_extra_0 * frac),
        horas_noturnas: round2(horasPorTipo.horas_noturnas * frac),
        horas_extra_noturna: round2(horasPorTipo.horas_extra_noturna * frac),
      };
    }

    return item;
  });

  // Ajuste de arredondamento: distribuir resto no maior item
  const somaRateada = resultados.reduce((sum, r) => sum + r.horasRateadas, 0);
  const diff = round2(horasBase - somaRateada);
  if (diff !== 0 && resultados.length > 0) {
    const maiorIdx = resultados.reduce((maxIdx, r, idx, arr) =>
      r.horasRateadas > arr[maxIdx].horasRateadas ? idx : maxIdx, 0);
    resultados[maiorIdx].horasRateadas = round2(resultados[maiorIdx].horasRateadas + diff);
  }

  return resultados;
}

/**
 * Valida se a distribuição de horas está dentro da tolerância.
 *
 * @param horasBase Horas base do dia (Secullum)
 * @param totalApontado Total de horas apontadas nos projetos
 * @param tolerancia Tolerância em horas (default: 0.25h = 15min)
 */
export function validarDistribuicao(
  horasBase: number,
  totalApontado: number,
  tolerancia = 0.25,
): ValidacaoDistribuicao {
  const saldo = round2(horasBase - totalApontado);
  const absoluto = Math.abs(saldo);

  if (absoluto <= tolerancia) {
    return { valido: true, saldo };
  }

  if (saldo > 0) {
    return {
      valido: false,
      saldo,
      mensagem: `Faltam ${saldo.toFixed(2)}h para distribuir`,
    };
  }

  return {
    valido: false,
    saldo,
    mensagem: `Excedente de ${absoluto.toFixed(2)}h sobre a base`,
  };
}

/** Arredonda para 2 casas decimais */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
