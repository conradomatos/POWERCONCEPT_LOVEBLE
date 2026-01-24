import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BudgetLaborCatalogItem } from './useBudgetLaborCatalog';

export interface BudgetLaborItem {
  id: string;
  revision_id: string;
  catalog_id: string | null;
  codigo_snapshot: string;
  nome_snapshot: string;
  tipo_mo_snapshot: 'MOD' | 'MOI';
  regime_snapshot: 'CLT' | 'PL';
  carga_horaria_snapshot: number;
  valor_ref_hh_snapshot: number | null;
  valor_hh_override: number | null;
  valor_hh_efetivo?: number; // From view
  qtd_hh: number;
  total: number; // Generated column
  observacao: string | null;
  created_at: string;
  updated_at: string;
  // View fields
  has_override?: boolean;
  catalog_valor_ref_hh_atual?: number | null;
  catalog_nome_atual?: string | null;
}

export interface BudgetLaborItemFormData {
  catalog_id?: string | null;
  codigo_snapshot: string;
  nome_snapshot: string;
  tipo_mo_snapshot?: 'MOD' | 'MOI';
  regime_snapshot?: 'CLT' | 'PL';
  carga_horaria_snapshot?: number;
  valor_ref_hh_snapshot?: number | null;
  valor_hh_override?: number | null;
  qtd_hh?: number;
  observacao?: string | null;
}

export function useBudgetLaborItems(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['budget-labor-items', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      
      const { data, error } = await supabase
        .from('vw_budget_labor_items')
        .select('*')
        .eq('revision_id', revisionId)
        .order('nome_snapshot');

      if (error) throw error;
      return data as BudgetLaborItem[];
    },
    enabled: !!revisionId,
  });

  // Add single item from catalog with snapshot
  const addFromCatalog = useMutation({
    mutationFn: async (catalogItem: BudgetLaborCatalogItem) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('budget_labor_items')
        .insert({
          revision_id: revisionId,
          catalog_id: catalogItem.id,
          codigo_snapshot: catalogItem.codigo,
          nome_snapshot: catalogItem.nome,
          tipo_mo_snapshot: catalogItem.tipo_mo,
          regime_snapshot: catalogItem.regime,
          carga_horaria_snapshot: catalogItem.carga_horaria_mensal,
          valor_ref_hh_snapshot: catalogItem.valor_ref_hh,
          valor_hh_override: null, // Uses ref by default
          qtd_hh: 0,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-items', revisionId] });
      toast.success('Função adicionada do catálogo');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('Esta função já existe no orçamento');
      } else {
        toast.error(`Erro ao adicionar: ${error.message}`);
      }
    },
  });

  // Add multiple items from catalog with snapshots
  const addBatchFromCatalog = useMutation({
    mutationFn: async (catalogItems: BudgetLaborCatalogItem[]) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      if (catalogItems.length === 0) throw new Error('Nenhum item selecionado');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData = catalogItems.map(catalogItem => ({
        revision_id: revisionId,
        catalog_id: catalogItem.id,
        codigo_snapshot: catalogItem.codigo,
        nome_snapshot: catalogItem.nome,
        tipo_mo_snapshot: catalogItem.tipo_mo,
        regime_snapshot: catalogItem.regime,
        carga_horaria_snapshot: catalogItem.carga_horaria_mensal,
        valor_ref_hh_snapshot: catalogItem.valor_ref_hh,
        valor_hh_override: null,
        qtd_hh: 0,
        created_by: userData.user?.id,
        updated_by: userData.user?.id,
      }));

      const { data, error } = await supabase
        .from('budget_labor_items')
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-items', revisionId] });
      toast.success(`${data?.length || 0} função(ões) adicionada(s) do catálogo`);
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('Algumas funções já existem no orçamento');
      } else {
        toast.error(`Erro ao adicionar: ${error.message}`);
      }
    },
  });

  // Add manual item (not from catalog)
  const addManual = useMutation({
    mutationFn: async (formData: BudgetLaborItemFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('budget_labor_items')
        .insert({
          revision_id: revisionId,
          catalog_id: null,
          codigo_snapshot: formData.codigo_snapshot,
          nome_snapshot: formData.nome_snapshot,
          tipo_mo_snapshot: formData.tipo_mo_snapshot || 'MOD',
          regime_snapshot: formData.regime_snapshot || 'CLT',
          carga_horaria_snapshot: formData.carga_horaria_snapshot || 220,
          valor_ref_hh_snapshot: formData.valor_ref_hh_snapshot,
          valor_hh_override: formData.valor_hh_override,
          qtd_hh: formData.qtd_hh || 0,
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
      queryClient.invalidateQueries({ queryKey: ['budget-labor-items', revisionId] });
      toast.success('Função adicionada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetLaborItem> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Remove view fields
      const { 
        valor_hh_efetivo, has_override, catalog_valor_ref_hh_atual, catalog_nome_atual,
        created_at, updated_at, total, ...updateData 
      } = updates as any;

      const { data, error } = await supabase
        .from('budget_labor_items')
        .update({
          ...updateData,
          updated_by: userData.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-items', revisionId] });
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
        .from('budget_labor_items')
        .update({
          valor_hh_override: null,
          updated_by: userData.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-items', revisionId] });
      toast.success('Valor resetado para referência');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resetar: ${error.message}`);
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_labor_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-items', revisionId] });
      toast.success('Função removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Calculate totals
  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalHH = items.reduce((sum, item) => sum + (item.qtd_hh || 0), 0);

  // Helper to get effective price
  const getEffectivePrice = (item: BudgetLaborItem): number => {
    return item.valor_hh_override ?? item.valor_ref_hh_snapshot ?? 0;
  };

  return {
    items,
    total,
    totalHH,
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
