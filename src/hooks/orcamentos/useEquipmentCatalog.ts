import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EquipmentCatalogItem {
  id: string;
  descricao: string;
  valor_mensal_ref: number;
  created_at: string;
}

export interface EquipmentCatalogFormData {
  descricao: string;
  valor_mensal_ref: number;
}

export function useEquipmentCatalog() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_rentals_catalog')
        .select('*')
        .order('descricao');

      if (error) throw error;
      return data as EquipmentCatalogItem[];
    },
  });

  const searchCatalog = async (term: string): Promise<EquipmentCatalogItem[]> => {
    if (!term || term.length < 2) return [];
    
    const { data, error } = await supabase
      .from('equipment_rentals_catalog')
      .select('*')
      .ilike('descricao', `%${term}%`)
      .limit(20);

    if (error) {
      console.error('Error searching equipment catalog:', error);
      return [];
    }
    return data as EquipmentCatalogItem[];
  };

  const createItem = useMutation({
    mutationFn: async (formData: EquipmentCatalogFormData) => {
      const { data, error } = await supabase
        .from('equipment_rentals_catalog')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog'] });
      toast.success('Equipamento adicionado ao catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar equipamento: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EquipmentCatalogItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('equipment_rentals_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar equipamento: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_rentals_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog'] });
      toast.success('Equipamento removido do catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover equipamento: ${error.message}`);
    },
  });

  return {
    items,
    isLoading,
    searchCatalog,
    createItem,
    updateItem,
    deleteItem,
  };
}
