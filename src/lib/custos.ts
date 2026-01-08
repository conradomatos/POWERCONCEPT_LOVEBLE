// Constantes fixas de cálculo
export const HORAS_MENSAIS_PADRAO = 220;
export const PERC_PERICULOSIDADE = 0.30;

export type Classificacao = 'CLT' | 'PJ';

export interface CustoColaborador {
  id: string;
  colaborador_id: string;
  salario_base: number;
  periculosidade: boolean;
  beneficios: number;
  classificacao: Classificacao;
  inicio_vigencia: string;
  fim_vigencia: string | null;
  motivo_alteracao: string;
  observacao: string;
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
  const beneficios = Number(custo.beneficios) || 0;
  const periculosidade = custo.periculosidade || false;
  const classificacao = custo.classificacao || 'CLT';

  // PJ: apenas salário base, sem periculosidade ou benefícios
  if (classificacao === 'PJ') {
    return {
      beneficios: 0,
      adicional_periculosidade: 0,
      custo_mensal_total: Math.round(salarioBase * 100) / 100,
      custo_hora: Math.round((salarioBase / HORAS_MENSAIS_PADRAO) * 100) / 100,
    };
  }

  // CLT: cálculo completo
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
  if (!dateString) return 'Em aberto';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
}

// Parse BRL formatted string to number
export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  // Remove currency symbol, dots (thousands) and replace comma with dot
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Format number to BRL display (20.000,00)
export function formatCurrencyInput(value: string): string {
  // Remove non-numeric chars except comma and dot
  let cleaned = value.replace(/[^\d]/g, '');
  
  if (!cleaned) return '';
  
  // Convert to number with 2 decimal places
  const num = parseInt(cleaned, 10) / 100;
  
  // Format as BRL without symbol
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Check if a custo is currently vigente
export function isVigente(custo: CustoColaborador): boolean {
  const today = new Date().toISOString().split('T')[0];
  // Vigente if: fim_vigencia is null (open) OR today is between inicio and fim
  if (!custo.fim_vigencia) {
    return custo.inicio_vigencia <= today;
  }
  return custo.inicio_vigencia <= today && custo.fim_vigencia >= today;
}

// Check if a custo is encerrado
export function isEncerrado(custo: CustoColaborador): boolean {
  if (!custo.fim_vigencia) return false;
  const today = new Date().toISOString().split('T')[0];
  return custo.fim_vigencia < today;
}
