import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaxRule {
  id: string;
  revision_id: string;
  nome: string;
  tipo: 'PERCENT' | 'FIXED';
  valor: number;
  base: 'SALE' | 'COST';
  aplica_em: 'ALL' | 'MATERIALS' | 'SERVICES';
  ativo: boolean;
  created_at: string;
}

export interface TaxRuleFormData {
  nome: string;
  tipo: 'PERCENT' | 'FIXED';
  valor: number;
  base: 'SALE' | 'COST';
  aplica_em: 'ALL' | 'MATERIALS' | 'SERVICES';
  ativo?: boolean;
}

export function useTaxRules(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['tax-rules', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('tax_rules')
        .select('*')
        .eq('revision_id', revisionId)
        .order('nome');

      if (error) throw error;
      return data as TaxRule[];
    },
    enabled: !!revisionId,
  });

  const createRule = useMutation({
    mutationFn: async (formData: TaxRuleFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data, error } = await supabase
        .from('tax_rules')
        .insert({
          revision_id: revisionId,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules', revisionId] });
      toast.success('Imposto adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar imposto: ${error.message}`);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<TaxRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('tax_rules')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules', revisionId] });
      toast.success('Imposto atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar imposto: ${error.message}`);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules', revisionId] });
      toast.success('Imposto removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover imposto: ${error.message}`);
    },
  });

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
  };
}
