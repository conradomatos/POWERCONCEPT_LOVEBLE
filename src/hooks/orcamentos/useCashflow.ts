import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CashflowEntry {
  id: string;
  revision_id: string;
  mes_ref: string;
  categoria: string;
  valor: number;
}

export interface CashflowFormData {
  mes_ref: string;
  categoria: string;
  valor: number;
}

export const CASHFLOW_CATEGORIES = [
  'MATERIAIS',
  'MO',
  'MOBILIZACAO',
  'CANTEIRO',
  'EQUIPAMENTOS',
  'ENGENHARIA',
] as const;

export type CashflowCategory = typeof CASHFLOW_CATEGORIES[number];

export function useCashflow(revisionId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cashflowQuery = useQuery({
    queryKey: ['cashflow', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('cashflow_schedule')
        .select('*')
        .eq('revision_id', revisionId)
        .order('mes_ref');

      if (error) throw error;
      return data as CashflowEntry[];
    },
    enabled: !!revisionId,
  });

  const upsertEntry = useMutation({
    mutationFn: async (data: CashflowFormData) => {
      if (!revisionId) throw new Error('Revision ID required');

      const { error } = await supabase
        .from('cashflow_schedule')
        .upsert({
          revision_id: revisionId,
          mes_ref: data.mes_ref,
          categoria: data.categoria,
          valor: data.valor,
        }, {
          onConflict: 'revision_id,mes_ref,categoria',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflow', revisionId] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar cronograma', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cashflow_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflow', revisionId] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover entrada', description: error.message, variant: 'destructive' });
    },
  });

  // Generate cashflow from budget data
  const generateFromBudget = useMutation({
    mutationFn: async (prazoMeses: number) => {
      if (!revisionId || prazoMeses < 1) throw new Error('Invalid parameters');

      // Fetch current totals
      const { data: summary } = await supabase
        .from('budget_summary')
        .select('*')
        .eq('revision_id', revisionId)
        .single();

      if (!summary) throw new Error('Resumo não encontrado. Recalcule o resumo primeiro.');

      // Distribute costs evenly across months
      const entries: CashflowFormData[] = [];
      const startDate = new Date();
      startDate.setDate(1); // First day of current month

      const categoryTotals: Record<CashflowCategory, number> = {
        MATERIAIS: Number(summary.total_materiais) || 0,
        MO: Number(summary.total_mo) || 0,
        MOBILIZACAO: Number(summary.total_mobilizacao) || 0,
        CANTEIRO: Number(summary.total_canteiro) || 0,
        EQUIPAMENTOS: Number(summary.total_equipamentos) || 0,
        ENGENHARIA: Number(summary.total_engenharia) || 0,
      };

      for (let month = 0; month < prazoMeses; month++) {
        const mesRef = new Date(startDate);
        mesRef.setMonth(mesRef.getMonth() + month);
        const mesRefStr = mesRef.toISOString().split('T')[0];

        for (const categoria of CASHFLOW_CATEGORIES) {
          const valorMensal = categoryTotals[categoria] / prazoMeses;
          if (valorMensal > 0) {
            entries.push({
              mes_ref: mesRefStr,
              categoria,
              valor: Math.round(valorMensal * 100) / 100,
            });
          }
        }
      }

      // Delete existing and insert new
      await supabase.from('cashflow_schedule').delete().eq('revision_id', revisionId);

      if (entries.length > 0) {
        const { error } = await supabase
          .from('cashflow_schedule')
          .insert(entries.map(e => ({ ...e, revision_id: revisionId })));

        if (error) throw error;
      }

      return entries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflow', revisionId] });
      toast({ title: 'Cronograma de desembolso gerado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao gerar cronograma', description: error.message, variant: 'destructive' });
    },
  });

  // Calculate totals
  const entries = cashflowQuery.data || [];

  const totalsByMonth = entries.reduce((acc, entry) => {
    const month = entry.mes_ref;
    acc[month] = (acc[month] || 0) + Number(entry.valor);
    return acc;
  }, {} as Record<string, number>);

  const totalsByCategory = entries.reduce((acc, entry) => {
    acc[entry.categoria] = (acc[entry.categoria] || 0) + Number(entry.valor);
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = entries.reduce((sum, entry) => sum + Number(entry.valor), 0);

  return {
    entries,
    totalsByMonth,
    totalsByCategory,
    grandTotal,
    isLoading: cashflowQuery.isLoading,
    upsertEntry,
    deleteEntry,
    generateFromBudget,
  };
}
