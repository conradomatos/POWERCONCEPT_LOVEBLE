import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SupplyType } from '@/lib/orcamentos/types';

export interface MaterialItem {
  id: string;
  revision_id: string;
  wbs_id: string | null;
  item_seq: number;
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
}

export interface MaterialFormData {
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

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['budget-materials', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
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

  const createItem = useMutation({
    mutationFn: async (formData: MaterialFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data, error } = await supabase
        .from('budget_material_items')
        .insert({
          revision_id: revisionId,
          item_seq: getNextSeq(),
          ...formData,
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

  const updateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<MaterialItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('budget_material_items')
        .update(formData)
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
    preco: items.reduce((sum, item) => sum + item.preco_total, 0),
    hh: items.reduce((sum, item) => sum + item.hh_total, 0),
  };

  return {
    items,
    totals,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
}
