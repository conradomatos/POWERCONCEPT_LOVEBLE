import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EquipmentRental {
  id: string;
  revision_id: string;
  descricao: string;
  quantidade: number;
  valor_mensal: number;
  meses: number;
  total: number;
  created_at: string;
}

export interface EquipmentRentalFormData {
  descricao: string;
  quantidade: number;
  valor_mensal: number;
  meses: number;
}

export function useEquipmentRentals(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment-rentals', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('equipment_rentals')
        .select('*')
        .eq('revision_id', revisionId)
        .order('created_at');

      if (error) throw error;
      return data as EquipmentRental[];
    },
    enabled: !!revisionId,
  });

  const createItem = useMutation({
    mutationFn: async (formData: EquipmentRentalFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data, error } = await supabase
        .from('equipment_rentals')
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
      queryClient.invalidateQueries({ queryKey: ['equipment-rentals', revisionId] });
      toast.success('Item adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<EquipmentRental> & { id: string }) => {
      const { data, error } = await supabase
        .from('equipment_rentals')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rentals', revisionId] });
      toast.success('Item atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_rentals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rentals', revisionId] });
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
