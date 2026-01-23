import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type LaborParamCatalog = Database['public']['Tables']['labor_param_catalog']['Row'];

export interface LaborParamCatalogFormData {
  nome: string;
  encargos_pct_ref?: number;
  he50_pct_ref?: number;
  he100_pct_ref?: number;
  periculosidade_pct_ref?: number;
  insalubridade_pct_ref?: number;
  adicional_noturno_pct_ref?: number;
  improdutividade_pct_ref?: number;
}

export function useLaborParamCatalog() {
  const queryClient = useQueryClient();

  const { data: params = [], isLoading } = useQuery({
    queryKey: ['labor-param-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_param_catalog')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as LaborParamCatalog[];
    },
  });

  const createParam = useMutation({
    mutationFn: async (formData: LaborParamCatalogFormData) => {
      const { data, error } = await supabase
        .from('labor_param_catalog')
        .insert({
          nome: formData.nome,
          encargos_pct_ref: formData.encargos_pct_ref ?? 0,
          he50_pct_ref: formData.he50_pct_ref ?? 50,
          he100_pct_ref: formData.he100_pct_ref ?? 100,
          periculosidade_pct_ref: formData.periculosidade_pct_ref ?? 30,
          insalubridade_pct_ref: formData.insalubridade_pct_ref ?? 0,
          adicional_noturno_pct_ref: formData.adicional_noturno_pct_ref ?? 0,
          improdutividade_pct_ref: formData.improdutividade_pct_ref ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-param-catalog'] });
      toast.success('Conjunto de parâmetros criado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar parâmetros: ${error.message}`);
    },
  });

  const updateParam = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<LaborParamCatalog> & { id: string }) => {
      const { data, error } = await supabase
        .from('labor_param_catalog')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-param-catalog'] });
      toast.success('Parâmetros atualizados');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar parâmetros: ${error.message}`);
    },
  });

  const deleteParam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('labor_param_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-param-catalog'] });
      toast.success('Conjunto de parâmetros removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover parâmetros: ${error.message}`);
    },
  });

  return {
    params,
    isLoading,
    createParam,
    updateParam,
    deleteParam,
  };
}
