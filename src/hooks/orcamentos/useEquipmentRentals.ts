import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EquipmentRental {
  id: string;
  revision_id: string;
  catalog_id: string | null;
  descricao: string;
  quantidade: number;
  valor_mensal: number;
  meses: number;
  total: number;
  created_at?: string;
  // Campos da view (catálogo)
  valor_referencia?: number | null;
  from_catalog?: boolean;
}

export interface EquipmentRentalFormData {
  catalog_id?: string;
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
      
      // Try the view first, fallback to table
      const { data: viewData, error: viewError } = await supabase
        .from('vw_budget_equipment')
        .select('*')
        .eq('revision_id', revisionId)
        .order('descricao');

      if (!viewError && viewData) {
        return viewData as EquipmentRental[];
      }
      
      // Fallback to direct table query
      const { data, error } = await supabase
        .from('equipment_rentals')
        .select('*')
        .eq('revision_id', revisionId)
        .order('descricao');

      if (error) throw error;
      return data as EquipmentRental[];
    },
    enabled: !!revisionId,
  });

  // Import from catalog
  const createFromCatalog = useMutation({
    mutationFn: async ({ catalogId, quantidade, valor_mensal, meses }: {
      catalogId: string;
      quantidade: number;
      valor_mensal: number;
      meses: number;
    }) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      // Get catalog item for snapshot fields
      const { data: catalogItem, error: catalogError } = await supabase
        .from('equipment_rentals_catalog')
        .select('*')
        .eq('id', catalogId)
        .single();

      if (catalogError) throw catalogError;

      const total = quantidade * valor_mensal * meses;

      const { data, error } = await supabase
        .from('equipment_rentals')
        .insert({
          revision_id: revisionId,
          catalog_id: catalogId,
          // Snapshot from catalog
          descricao: catalogItem.descricao,
          // Budget-specific fields
          quantidade,
          valor_mensal,
          meses,
          total,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rentals', revisionId] });
      toast.success('Equipamento adicionado do catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar equipamento: ${error.message}`);
    },
  });

  // Create manual item (without catalog)
  const createItem = useMutation({
    mutationFn: async (formData: EquipmentRentalFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const total = formData.quantidade * formData.valor_mensal * formData.meses;
      
      const { data, error } = await supabase
        .from('equipment_rentals')
        .insert({
          revision_id: revisionId,
          catalog_id: formData.catalog_id || null,
          descricao: formData.descricao,
          quantidade: formData.quantidade,
          valor_mensal: formData.valor_mensal,
          meses: formData.meses,
          total,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rentals', revisionId] });
      toast.success('Equipamento adicionado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar equipamento: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<EquipmentRental> & { id: string }) => {
      // Recalculate total if relevant fields changed
      const updateData: Record<string, unknown> = { ...formData };
      
      if ('quantidade' in formData || 'valor_mensal' in formData || 'meses' in formData) {
        const item = items.find(i => i.id === id);
        if (item) {
          const qtd = formData.quantidade ?? item.quantidade;
          const valor = formData.valor_mensal ?? item.valor_mensal;
          const meses = formData.meses ?? item.meses;
          updateData.total = qtd * valor * meses;
        }
      }
      
      const { data, error } = await supabase
        .from('equipment_rentals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rentals', revisionId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar equipamento: ${error.message}`);
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
      toast.success('Equipamento removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover equipamento: ${error.message}`);
    },
  });

  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);

  return {
    items,
    total,
    isLoading,
    createItem,
    createFromCatalog,
    updateItem,
    deleteItem,
  };
}
