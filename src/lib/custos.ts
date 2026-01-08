// Constantes fixas de cálculo
export const HORAS_MENSAIS_PADRAO = 220;
export const PERC_PERICULOSIDADE = 0.30;

export interface CustoColaborador {
  id: string;
  colaborador_id: string;
  salario_base: number;
  periculosidade: boolean;
  vale_refeicao: number;
  vale_alimentacao: number;
  vale_transporte: number;
  ajuda_custo: number;
  plano_saude: number;
  inicio_vigencia: string;
  fim_vigencia: string | null;
  motivo_alteracao: string | null;
  classificacao: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustoCalculado {
  beneficios: number;
  adicional_periculosidade: number;
  custo_mensal_total: number;
  custo_hora: number;
}

export function calcularCustos(custo: Partial<CustoColaborador>): CustoCalculado {
  const salarioBase = Number(custo.salario_base) || 0;
  const valeRefeicao = Number(custo.vale_refeicao) || 0;
  const valeAlimentacao = Number(custo.vale_alimentacao) || 0;
  const valeTransporte = Number(custo.vale_transporte) || 0;
  const ajudaCusto = Number(custo.ajuda_custo) || 0;
  const planoSaude = Number(custo.plano_saude) || 0;
  const periculosidade = custo.periculosidade || false;

  const beneficios = valeRefeicao + valeAlimentacao + valeTransporte + ajudaCusto + planoSaude;
  const adicional_periculosidade = periculosidade ? salarioBase * PERC_PERICULOSIDADE : 0;
  const custo_mensal_total = salarioBase + adicional_periculosidade + beneficios;
  const custo_hora = custo_mensal_total / HORAS_MENSAIS_PADRAO;

  return {
    beneficios: Math.round(beneficios * 100) / 100,
    adicional_periculosidade: Math.round(adicional_periculosidade * 100) / 100,
    custo_mensal_total: Math.round(custo_mensal_total * 100) / 100,
    custo_hora: Math.round(custo_hora * 100) / 100,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
}
