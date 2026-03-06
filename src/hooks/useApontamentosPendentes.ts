import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ApontamentoPendente } from '@/services/secullum/types';

/**
 * Hook para buscar apontamentos pendentes de distribuição (Secullum).
 * Usa a view vw_apontamentos_pendentes que filtra apontamento_dia
 * com fonte_base='PONTO' e status IN ('PENDENTE', 'DIVERGENTE').
 */
export function useApontamentosPendentes(filters?: {
  dataInicio?: string;
  dataFim?: string;
  colaboradorId?: string;
}) {
  const { data: pendentes = [], isLoading } = useQuery({
    queryKey: ['apontamentos-pendentes', filters],
    queryFn: async () => {
      let query = supabase
        .from('vw_apontamentos_pendentes')
        .select('*')
        .order('data', { ascending: false })
        .limit(500);

      if (filters?.dataInicio) {
        query = query.gte('data', filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte('data', filters.dataFim);
      }
      if (filters?.colaboradorId) {
        query = query.eq('colaborador_id', filters.colaboradorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ApontamentoPendente[];
    },
  });

  return {
    pendentes,
    total: pendentes.length,
    isLoading,
  };
}
