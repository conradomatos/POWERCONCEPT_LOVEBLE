import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoriaMapeamento {
  id: string;
  codigo_omie: string;
  descricao_omie: string | null;
  categoria_contabil_id: string | null;
  conta_dre_override: string | null;
  conta_dre_omie: string | null;
  tipo_categoria: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['omie-categoria-mapeamento'];

export function useMapeamentos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_categoria_mapeamento')
        .select('*, categorias_contabeis(nome, conta_dre)')
        .order('codigo_omie', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMapeamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; conta_dre_override?: string | null; categoria_contabil_id?: string | null }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from('omie_categoria_mapeamento')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['dre-data'] });
    },
  });
}

export function useBatchUpdateMapeamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; conta_dre_override: string | null }>) => {
      for (const u of updates) {
        const { error } = await supabase
          .from('omie_categoria_mapeamento')
          .update({ conta_dre_override: u.conta_dre_override })
          .eq('id', u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['dre-data'] });
      toast.success('Mapeamentos salvos');
    },
  });
}

export function useMapeamentoStats() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'stats'],
    queryFn: async () => {
      // Get counts per category from AR
      const { data: arData } = await supabase
        .from('omie_contas_receber')
        .select('categoria')
        .not('categoria', 'is', null);
      
      // Get counts per category from AP
      const { data: apData } = await supabase
        .from('omie_contas_pagar')
        .select('categoria')
        .not('categoria', 'is', null);

      const counts = new Map<string, { qtd: number; valor: number }>();
      
      const process = (items: any[] | null) => {
        items?.forEach(item => {
          if (!item.categoria) return;
          const existing = counts.get(item.categoria) || { qtd: 0, valor: 0 };
          existing.qtd++;
          counts.set(item.categoria, existing);
        });
      };

      process(arData);
      process(apData);

      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Mapa de nomes de conta DRE do Omie → formato usado na DRE do PowerConcept
const OMIE_DRE_TO_POWERCONCEPT: Record<string, string> = {
  'Receita Bruta de Vendas':            '(+) - Receita Bruta de Vendas',
  'Outras Receitas':                     '(+) - Outras Receitas',
  'Receitas Financeiras':                '(+) - Receitas Financeiras',
  'Deduções de Receita':                 '(-) - Deduções de Receita',
  'Impostos':                            '(-) - Impostos sobre o Lucro',
  'Outras Deduções':                     '(-) - Outras Deduções',
  'Outras Deduções de Receita':          '(-) - Outras Deduções',
  'CMC das Vendas':                      '(-) - Custo dos Serviços Prestados',
  'Custo dos Serviços Prestados':        '(-) - Custo dos Serviços Prestados',
  'Outros Custos':                       '(-) - Outros Custos',
  'Despesas Variáveis':                  '(-) - Despesas Variáveis',
  'Recuperação de Despesas Variáveis':   '(+) - Recuperação de Despesas',
  'Recuperação Desp. Variáveis':         '(+) - Recuperação de Despesas',
  'Despesas com Pessoal':                '(-) - Despesas com Pessoal',
  'Despesas Administrativas':            '(-) - Despesas Administrativas',
  'Despesas Financeiras':                '(-) - Despesas Financeiras',
  'Despesas de Vendas e Marketing':      '(-) - Despesas de Vendas e Marketing',
  'Outros Tributos':                     '(-) - Outros Tributos',
  'Recuperação de Despesas Fixas':       '(+) - Recuperação de Despesas',
  'Recuperação Desp. Fixas':             '(+) - Recuperação de Despesas',
  'Ativos':                              '(-) - Investimentos',
  'Serviços':                            '(-) - Investimentos',
};

// Helper: suggest conta_dre based on conta_dre_omie field (populated by ListarCategorias sync)
export function suggestContaDRE(codigoOmie: string, contaDreOmie?: string | null): string | null {
  // PRIORIDADE 1: usar o nome da conta DRE que veio do Omie
  if (contaDreOmie) {
    const mapped = OMIE_DRE_TO_POWERCONCEPT[contaDreOmie];
    if (mapped) return mapped;

    // Tentar match parcial (caso o Omie retorne variações)
    const lower = contaDreOmie.toLowerCase();
    for (const [key, val] of Object.entries(OMIE_DRE_TO_POWERCONCEPT)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return val;
      }
    }
  }

  // PRIORIDADE 2: fallback por prefixo do código
  if (codigoOmie.startsWith('1.01.01')) return '(+) - Receita Bruta de Vendas';
  if (codigoOmie.startsWith('1.01.02') || codigoOmie.startsWith('1.01.03')) return '(-) - Deduções de Receita';
  if (codigoOmie.startsWith('1.11')) return '(+) - Outras Receitas';
  if (codigoOmie.startsWith('1.21')) return '(-) - Custo dos Serviços Prestados';
  if (codigoOmie.startsWith('1.')) return '(+) - Receita Bruta de Vendas';
  if (codigoOmie.startsWith('2.01')) return '(-) - Despesas Variáveis';
  if (codigoOmie.startsWith('2.11.01')) return '(-) - Despesas com Pessoal';
  if (codigoOmie.startsWith('2.11.02')) return '(-) - Despesas Administrativas';
  if (codigoOmie.startsWith('2.11.03')) return '(-) - Despesas Financeiras';
  if (codigoOmie.startsWith('2.11.04')) return '(-) - Despesas de Vendas e Marketing';
  if (codigoOmie.startsWith('2.')) return '(-) - Despesas Administrativas';
  if (codigoOmie.startsWith('3.')) return '(-) - Investimentos';

  return null;
}
