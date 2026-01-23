import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SupplyType } from '@/lib/orcamentos/types';

export interface MaterialItem {
  id: string;
  revision_id: string;
  wbs_id: string | null;
  item_seq: number;
  catalog_id: string | null;
  codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  fornecimento: SupplyType;
  hh_unitario: number;
  fator_dificuldade: number;
  hh_total: number;
  preco_unit: number;
  preco_total: number;
  observacao: string | null;
  // Campos da view (catálogo)
  hh_unitario_ref?: number;
  categoria?: string | null;
  preco_referencia?: number | null;
  from_catalog?: boolean;
}

export interface MaterialFormData {
  catalog_id?: string;
  codigo?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  fornecimento?: SupplyType;
  hh_unitario?: number;
  fator_dificuldade?: number;
  preco_unit?: number;
  wbs_id?: string;
  observacao?: string;
}

export function useMaterials(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  // Query using the view for enriched data
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['budget-materials', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      
      // Try the view first, fallback to table
      const { data: viewData, error: viewError } = await supabase
        .from('vw_budget_materials')
        .select('*')
        .eq('revision_id', revisionId)
        .order('item_seq');

      if (!viewError && viewData) {
        return viewData as MaterialItem[];
      }

      // Fallback to direct table query
      const { data, error } = await supabase
        .from('budget_material_items')
        .select('*')
        .eq('revision_id', revisionId)
        .order('item_seq');

      if (error) throw error;
      return data as MaterialItem[];
    },
    enabled: !!revisionId,
  });

  const getNextSeq = () => {
    if (items.length === 0) return 1;
    return Math.max(...items.map(i => i.item_seq)) + 1;
  };

  // Create from catalog (uses catalog_id)
  const createFromCatalog = useMutation({
    mutationFn: async ({ catalogId, quantidade, preco_unit, fator_dificuldade, fornecimento }: {
      catalogId: string;
      quantidade: number;
      preco_unit: number;
      fator_dificuldade?: number;
      fornecimento?: SupplyType;
    }) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      // Get catalog item for snapshot fields
      const { data: catalogItem, error: catalogError } = await supabase
        .from('material_catalog')
        .select('*')
        .eq('id', catalogId)
        .single();

      if (catalogError) throw catalogError;

      const { data, error } = await supabase
        .from('budget_material_items')
        .insert({
          revision_id: revisionId,
          item_seq: getNextSeq(),
          catalog_id: catalogId,
          // Snapshot fields from catalog (for offline/historical purposes)
          codigo: catalogItem.codigo,
          descricao: catalogItem.descricao,
          unidade: catalogItem.unidade,
          hh_unitario: catalogItem.hh_unit_ref || 0,
          // Budget-specific fields
          quantidade,
          preco_unit,
          fator_dificuldade: fator_dificuldade ?? 1,
          fornecimento: fornecimento ?? 'A_DEFINIR',
          // Calculated fields (will be recalculated by trigger/view)
          hh_total: quantidade * (catalogItem.hh_unit_ref || 0) * (fator_dificuldade ?? 1),
          preco_total: quantidade * preco_unit,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-materials', revisionId] });
      toast.success('Material adicionado do catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar material: ${error.message}`);
    },
  });

  // Create manual item (without catalog reference)
  const createItem = useMutation({
    mutationFn: async (formData: MaterialFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const hh_total = (formData.quantidade || 0) * (formData.hh_unitario || 0) * (formData.fator_dificuldade || 1);
      const preco_total = (formData.quantidade || 0) * (formData.preco_unit || 0);
      
      const { data, error } = await supabase
        .from('budget_material_items')
        .insert({
          revision_id: revisionId,
          item_seq: getNextSeq(),
          catalog_id: formData.catalog_id || null,
          codigo: formData.codigo || null,
          descricao: formData.descricao,
          unidade: formData.unidade,
          quantidade: formData.quantidade,
          hh_unitario: formData.hh_unitario ?? 0,
          fator_dificuldade: formData.fator_dificuldade ?? 1,
          fornecimento: formData.fornecimento ?? 'A_DEFINIR',
          preco_unit: formData.preco_unit ?? 0,
          hh_total,
          preco_total,
          observacao: formData.observacao || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-materials', revisionId] });
      toast.success('Material adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar material: ${error.message}`);
    },
  });

  // Update only budget-specific fields
  const updateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<MaterialItem> & { id: string }) => {
      // Recalculate totals if relevant fields changed
      const updateData: Record<string, unknown> = { ...formData };
      
      // If quantity, hh_unitario, fator_dificuldade, or preco_unit changed, recalculate
      if ('quantidade' in formData || 'hh_unitario' in formData || 'fator_dificuldade' in formData) {
        const item = items.find(i => i.id === id);
        if (item) {
          const qtd = formData.quantidade ?? item.quantidade;
          const hh = formData.hh_unitario ?? item.hh_unitario;
          const fator = formData.fator_dificuldade ?? item.fator_dificuldade;
          updateData.hh_total = qtd * hh * fator;
        }
      }
      
      if ('quantidade' in formData || 'preco_unit' in formData) {
        const item = items.find(i => i.id === id);
        if (item) {
          const qtd = formData.quantidade ?? item.quantidade;
          const preco = formData.preco_unit ?? item.preco_unit;
          updateData.preco_total = qtd * preco;
        }
      }

      const { data, error } = await supabase
        .from('budget_material_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-materials', revisionId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar material: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_material_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-materials', revisionId] });
      toast.success('Material removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover material: ${error.message}`);
    },
  });

  const totals = {
    preco: items.reduce((sum, item) => sum + (item.preco_total || 0), 0),
    hh: items.reduce((sum, item) => sum + (item.hh_total || 0), 0),
  };

  return {
    items,
    totals,
    isLoading,
    createItem,
    createFromCatalog,
    updateItem,
    deleteItem,
  };
}
