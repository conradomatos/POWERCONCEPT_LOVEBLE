import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MobilizationItem {
  id: string;
  revision_id: string;
  wbs_id: string | null;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  valor_unitario: number;
  total: number;
  created_at: string;
}

export interface MobilizationFormData {
  descricao: string;
  unidade?: string;
  quantidade: number;
  valor_unitario: number;
  wbs_id?: string;
}

export function useMobilization(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['mobilization-items', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('mobilization_items')
        .select('*')
        .eq('revision_id', revisionId)
        .order('created_at');

      if (error) throw error;
      return data as MobilizationItem[];
    },
    enabled: !!revisionId,
  });

  const createItem = useMutation({
    mutationFn: async (formData: MobilizationFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data, error } = await supabase
        .from('mobilization_items')
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
      queryClient.invalidateQueries({ queryKey: ['mobilization-items', revisionId] });
      toast.success('Item adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<MobilizationItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('mobilization_items')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobilization-items', revisionId] });
      toast.success('Item atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mobilization_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobilization-items', revisionId] });
      toast.success('Item removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover item: ${error.message}`);
    },
  });

  const total = items.reduce((sum, item) => sum + item.total, 0);

  return {
    items,
    total,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
}
