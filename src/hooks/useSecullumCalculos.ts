import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SecullumCalculo, SecullumAfastamento } from '@/services/secullum/types';

/**
 * Hook para buscar cálculos Secullum de um colaborador em uma data específica.
 */
export function useSecullumCalculos(colaboradorId?: string, data?: string) {
  const { data: calculo, isLoading } = useQuery({
    queryKey: ['secullum-calculos', colaboradorId, data],
    queryFn: async () => {
      if (!colaboradorId || !data) return null;

      const { data: row, error } = await supabase
        .from('secullum_calculos')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .eq('data', data)
        .maybeSingle();

      if (error) throw error;
      return row as SecullumCalculo | null;
    },
    enabled: !!colaboradorId && !!data,
  });

  return { calculo, isLoading };
}

/**
 * Hook para buscar cálculos Secullum de um colaborador em um período.
 */
export function useSecullumCalculosPeriodo(
  colaboradorId?: string,
  dataInicio?: string,
  dataFim?: string,
) {
  const { data: calculos = [], isLoading } = useQuery({
    queryKey: ['secullum-calculos-periodo', colaboradorId, dataInicio, dataFim],
    queryFn: async () => {
      if (!colaboradorId || !dataInicio || !dataFim) return [];

      const { data, error } = await supabase
        .from('secullum_calculos')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true });

      if (error) throw error;
      return data as SecullumCalculo[];
    },
    enabled: !!colaboradorId && !!dataInicio && !!dataFim,
  });

  return { calculos, isLoading };
}

/**
 * Hook para buscar afastamentos de um colaborador que cubram uma data.
 */
export function useSecullumAfastamento(colaboradorId?: string, data?: string) {
  const { data: afastamento, isLoading } = useQuery({
    queryKey: ['secullum-afastamentos', colaboradorId, data],
    queryFn: async () => {
      if (!colaboradorId || !data) return null;

      const { data: row, error } = await supabase
        .from('secullum_afastamentos')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .lte('data_inicio', data)
        .gte('data_fim', data)
        .maybeSingle();

      if (error) throw error;
      return row as SecullumAfastamento | null;
    },
    enabled: !!colaboradorId && !!data,
  });

  return { afastamento, isLoading };
}
