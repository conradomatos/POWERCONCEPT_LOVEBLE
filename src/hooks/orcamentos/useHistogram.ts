import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HistogramEntry {
  id: string;
  revision_id: string;
  labor_role_id: string;
  mes_ref: string;
  hh_normais: number;
  hh_50: number;
  hh_100: number;
  hh_total: number;
  custo_total: number;
  labor_role?: {
    id: string;
    funcao: string;
  };
}

export interface HistogramFormData {
  labor_role_id: string;
  mes_ref: string;
  hh_normais: number;
  hh_50?: number;
  hh_100?: number;
}

export function useHistogram(revisionId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const histogramQuery = useQuery({
    queryKey: ['histogram', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('budget_histogram')
        .select(`
          *,
          labor_role:labor_roles(id, funcao)
        `)
        .eq('revision_id', revisionId)
        .order('mes_ref');

      if (error) throw error;
      return data as HistogramEntry[];
    },
    enabled: !!revisionId,
  });

  const upsertEntry = useMutation({
    mutationFn: async (data: HistogramFormData) => {
      if (!revisionId) throw new Error('Revision ID required');

      const { error } = await supabase
        .from('budget_histogram')
        .upsert({
          revision_id: revisionId,
          labor_role_id: data.labor_role_id,
          mes_ref: data.mes_ref,
          hh_normais: data.hh_normais,
          hh_50: data.hh_50 || 0,
          hh_100: data.hh_100 || 0,
        }, {
          onConflict: 'revision_id,labor_role_id,mes_ref',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['histogram', revisionId] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar histograma', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_histogram')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['histogram', revisionId] });
      toast({ title: 'Entrada removida do histograma' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover entrada', description: error.message, variant: 'destructive' });
    },
  });

  // Calculate totals by month and by role
  const entries = histogramQuery.data || [];
  
  const totalsByMonth = entries.reduce((acc, entry) => {
    const month = entry.mes_ref;
    if (!acc[month]) {
      acc[month] = { hh_total: 0, custo_total: 0 };
    }
    acc[month].hh_total += Number(entry.hh_total);
    acc[month].custo_total += Number(entry.custo_total);
    return acc;
  }, {} as Record<string, { hh_total: number; custo_total: number }>);

  const totalsByRole = entries.reduce((acc, entry) => {
    const roleId = entry.labor_role_id;
    if (!acc[roleId]) {
      acc[roleId] = { hh_total: 0, custo_total: 0, funcao: entry.labor_role?.funcao || '' };
    }
    acc[roleId].hh_total += Number(entry.hh_total);
    acc[roleId].custo_total += Number(entry.custo_total);
    return acc;
  }, {} as Record<string, { hh_total: number; custo_total: number; funcao: string }>);

  const grandTotal = entries.reduce((acc, entry) => ({
    hh_total: acc.hh_total + Number(entry.hh_total),
    custo_total: acc.custo_total + Number(entry.custo_total),
  }), { hh_total: 0, custo_total: 0 });

  return {
    entries,
    totalsByMonth,
    totalsByRole,
    grandTotal,
    isLoading: histogramQuery.isLoading,
    upsertEntry,
    deleteEntry,
  };
}
