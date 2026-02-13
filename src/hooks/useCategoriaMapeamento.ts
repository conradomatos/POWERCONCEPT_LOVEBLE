import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoriaMapeamento {
  id: string;
  codigo_omie: string;
  descricao_omie: string | null;
  categoria_contabil_id: string | null;
  conta_dre_override: string | null;
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

// Helper: suggest conta_dre based on Omie code prefix
export function suggestContaDRE(codigoOmie: string): string | null {
  if (codigoOmie.startsWith('1.01')) return '(+) - Receita Bruta de Vendas';
  if (codigoOmie.startsWith('1.02')) return '(+) - Outras Receitas';
  if (codigoOmie.startsWith('1.')) return '(+) - Outras Receitas';
  if (codigoOmie.startsWith('2.01') || codigoOmie.startsWith('2.02') || codigoOmie.startsWith('2.03') || codigoOmie.startsWith('2.04')) {
    return '(-) - Custo dos Serviços Prestados';
  }
  if (codigoOmie.startsWith('2.05')) return '(-) - Despesas com Pessoal';
  if (codigoOmie.startsWith('2.06')) return '(-) - Despesas Administrativas';
  return null;
}
