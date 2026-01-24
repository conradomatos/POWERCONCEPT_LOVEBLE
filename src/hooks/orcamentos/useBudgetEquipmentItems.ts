import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EquipmentCatalogItem } from './useEquipmentCatalogNew';

export interface BudgetEquipmentItem {
  id: string;
  revision_id: string;
  catalog_id: string | null;
  codigo_snapshot: string | null;
  descricao_snapshot: string;
  unidade_snapshot: string;
  preco_mensal_ref_snapshot: number;
  preco_mensal_override: number | null;
  qtd: number;
  meses: number;
  total: number; // Generated column
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetEquipmentItemFormData {
  catalog_id?: string;
  codigo_snapshot?: string;
  descricao_snapshot: string;
  unidade_snapshot?: string;
  preco_mensal_ref_snapshot?: number;
  preco_mensal_override?: number | null;
  qtd?: number;
  meses?: number;
  observacao?: string | null;
}

export function useBudgetEquipmentItems(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['budget-equipment-items', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      
      const { data, error } = await supabase
        .from('budget_equipment_items')
        .select('*')
        .eq('revision_id', revisionId)
        .order('descricao_snapshot');

      if (error) throw error;
      return data as BudgetEquipmentItem[];
    },
    enabled: !!revisionId,
  });

  // Add single item from catalog with snapshot
  const addFromCatalog = useMutation({
    mutationFn: async (catalogItem: EquipmentCatalogItem) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('budget_equipment_items')
        .insert({
          revision_id: revisionId,
          catalog_id: catalogItem.id,
          codigo_snapshot: catalogItem.codigo,
          descricao_snapshot: catalogItem.descricao,
          unidade_snapshot: catalogItem.unidade,
          preco_mensal_ref_snapshot: catalogItem.preco_mensal_ref,
          preco_mensal_override: null, // Uses ref by default
          qtd: 1,
          meses: 1,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-equipment-items', revisionId] });
      toast.success('Equipamento adicionado do catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  // Add multiple items from catalog with snapshots
  const addBatchFromCatalog = useMutation({
    mutationFn: async (catalogItems: EquipmentCatalogItem[]) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      if (catalogItems.length === 0) throw new Error('Nenhum item selecionado');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData = catalogItems.map(catalogItem => ({
        revision_id: revisionId,
        catalog_id: catalogItem.id,
        codigo_snapshot: catalogItem.codigo,
        descricao_snapshot: catalogItem.descricao,
        unidade_snapshot: catalogItem.unidade,
        preco_mensal_ref_snapshot: catalogItem.preco_mensal_ref,
        preco_mensal_override: null,
        qtd: 1,
        meses: 1,
        created_by: userData.user?.id,
        updated_by: userData.user?.id,
      }));

      const { data, error } = await supabase
        .from('budget_equipment_items')
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-equipment-items', revisionId] });
      toast.success(`${data?.length || 0} equipamento(s) adicionado(s) do catálogo`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  // Add manual item (not from catalog)
  const addManual = useMutation({
    mutationFn: async (formData: BudgetEquipmentItemFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('budget_equipment_items')
        .insert({
          revision_id: revisionId,
          catalog_id: null,
          codigo_snapshot: formData.codigo_snapshot || null,
          descricao_snapshot: formData.descricao_snapshot,
          unidade_snapshot: formData.unidade_snapshot || 'mês',
          preco_mensal_ref_snapshot: formData.preco_mensal_ref_snapshot || 0,
          preco_mensal_override: formData.preco_mensal_override,
          qtd: formData.qtd || 1,
          meses: formData.meses || 1,
          observacao: formData.observacao,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-equipment-items', revisionId] });
      toast.success('Equipamento adicionado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetEquipmentItem> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('budget_equipment_items')
        .update({
          ...updates,
          updated_by: userData.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-equipment-items', revisionId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Reset override to use catalog reference price
  const resetToReference = useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('budget_equipment_items')
        .update({
          preco_mensal_override: null,
          updated_by: userData.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-equipment-items', revisionId] });
      toast.success('Preço resetado para referência');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resetar preço: ${error.message}`);
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_equipment_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-equipment-items', revisionId] });
      toast.success('Equipamento removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Calculate totals
  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);

  // Helper to get effective price
  const getEffectivePrice = (item: BudgetEquipmentItem): number => {
    return item.preco_mensal_override ?? item.preco_mensal_ref_snapshot;
  };

  return {
    items,
    total,
    isLoading,
    addFromCatalog,
    addBatchFromCatalog,
    addManual,
    updateItem,
    resetToReference,
    deleteItem,
    getEffectivePrice,
  };
}
