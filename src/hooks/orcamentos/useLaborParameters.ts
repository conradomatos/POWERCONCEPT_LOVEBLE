import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaborParameters {
  id: string;
  revision_id: string;
  encargos_pct: number;
  he50_pct: number;
  he100_pct: number;
  adicional_noturno_pct: number;
  periculosidade_pct: number;
  insalubridade_pct: number;
  improdutividade_pct: number;
  custos_pessoa_json: Record<string, number>;
  incidencias_json: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface LaborParametersFormData {
  encargos_pct: number;
  he50_pct: number;
  he100_pct: number;
  adicional_noturno_pct: number;
  periculosidade_pct: number;
  insalubridade_pct: number;
  improdutividade_pct: number;
  custos_pessoa_json?: Record<string, number>;
  incidencias_json?: Record<string, boolean>;
}

export function useLaborParameters(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: parameters, isLoading } = useQuery({
    queryKey: ['labor-parameters', revisionId],
    queryFn: async () => {
      if (!revisionId) return null;
      const { data, error } = await supabase
        .from('labor_parameters')
        .select('*')
        .eq('revision_id', revisionId)
        .maybeSingle();

      if (error) throw error;
      return data as LaborParameters | null;
    },
    enabled: !!revisionId,
  });

  const upsertParameters = useMutation({
    mutationFn: async (formData: LaborParametersFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');

      const { data, error } = await supabase
        .from('labor_parameters')
        .upsert({
          revision_id: revisionId,
          ...formData,
        }, { onConflict: 'revision_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-parameters', revisionId] });
      toast.success('Parâmetros salvos com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar parâmetros: ${error.message}`);
    },
  });

  return {
    parameters,
    isLoading,
    upsertParameters,
  };
}
