import { loadCategoriasStorage } from './categorias';
import type { DRERelatorio, DRESecao, DRELinha, DREAnual } from './types';

const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function buildDREEstrutura(periodo: string): DRERelatorio {
  const storage = loadCategoriasStorage();
  const categorias = storage.categorias.filter(c => c.ativa);

  const getCategoriasPorDRE = (contaDRE: string): string[] => {
    return categorias
      .filter(c => c.contaDRE === contaDRE)
      .map(c => c.nome);
  };

  const linha = (
    codigo: string,
    nome: string,
    contaDRE: string,
    sinal: '+' | '-',
    tipo: 'conta' | 'subtotal' | 'total' = 'conta',
    nivel: number = 1
  ): DRELinha => ({
    id: crypto.randomUUID(),
    codigo,
    nome,
    contaDRE,
    sinal,
    tipo,
    nivel,
    valor: 0,
    categorias: tipo === 'conta' ? getCategoriasPorDRE(contaDRE) : undefined,
  });

  const resultadoLinha = linha('5', 'RESULTADO LÍQUIDO DO EXERCÍCIO', '', '+', 'total', 0);

  const secoes: DRESecao[] = [
    {
      id: crypto.randomUUID(),
      titulo: 'RECEITA OPERACIONAL',
      linhas: [
        linha('1.1', 'Receita Bruta de Vendas', '(+) - Receita Bruta de Vendas', '+'),
        linha('1.2', 'Deduções de Receita', '(-) - Deduções de Receita', '-'),
      ],
      subtotal: linha('1', 'RECEITA LÍQUIDA', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'CUSTOS',
      linhas: [
        linha('2.1', 'Custo dos Serviços Prestados', '(-) - Custo dos Serviços Prestados', '-'),
        linha('2.2', 'Outros Custos', '(-) - Outros Custos', '-'),
      ],
      subtotal: linha('2', 'LUCRO BRUTO', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'DESPESAS OPERACIONAIS',
      linhas: [
        linha('3.1', 'Despesas com Pessoal', '(-) - Despesas com Pessoal', '-'),
        linha('3.2', 'Despesas Administrativas', '(-) - Despesas Administrativas', '-'),
        linha('3.3', 'Despesas de Vendas e Marketing', '(-) - Despesas de Vendas e Marketing', '-'),
        linha('3.4', 'Despesas Variáveis', '(-) - Despesas Variáveis', '-'),
      ],
      subtotal: linha('3', 'RESULTADO OPERACIONAL (EBITDA)', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'RESULTADO FINANCEIRO',
      linhas: [
        linha('4.1', 'Despesas Financeiras', '(-) - Despesas Financeiras', '-'),
        linha('4.2', 'Outras Receitas', '(+) - Outras Receitas', '+'),
        linha('4.3', 'Recuperação de Despesas Variáveis', '(+) - Recuperação de Despesas Variáveis', '+'),
      ],
      subtotal: linha('4', 'RESULTADO ANTES DOS IMPOSTOS', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'IMPOSTOS E CONTRIBUIÇÕES',
      linhas: [
        linha('5.1', 'Impostos', '(-) - Impostos', '-'),
        linha('5.2', 'Outros Tributos', '(-) - Outros Tributos', '-'),
        linha('5.3', 'Outras Deduções de Receita', '(-) - Outras Deduções de Receita', '-'),
      ],
      subtotal: resultadoLinha,
    },
  ];

  return {
    periodo,
    dataGeracao: new Date().toISOString(),
    secoes,
    resultado: resultadoLinha,
  };
}

export function buildDREAnual(ano: number): DREAnual {
  const meses = MESES_LABEL.map((m, _i) => buildDREEstrutura(`${m} ${ano}`));

  // Build acumulado by cloning structure and summing values
  const acumulado = buildDREEstrutura(`Acumulado ${ano}`);
  // For now all values are zero, so acumulado is already correct
  // When real data exists, sum each line across months here

  return { ano, meses, acumulado };
}

export function getCategoriasOrfas(): string[] {
  const storage = loadCategoriasStorage();
  return storage.categorias
    .filter(c => c.ativa && (!c.contaDRE || c.contaDRE.trim() === ''))
    .map(c => c.nome);
}
