import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BudgetWbs, WbsType } from '@/lib/orcamentos/types';

export interface WbsFormData {
  code: string;
  nome: string;
  tipo: WbsType;
  parent_id?: string | null;
  ordem?: number;
}

export function useWbs(revisionId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const wbsQuery = useQuery({
    queryKey: ['wbs', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('budget_wbs')
        .select('*')
        .eq('revision_id', revisionId)
        .order('ordem');

      if (error) throw error;
      return data as BudgetWbs[];
    },
    enabled: !!revisionId,
  });

  // Build hierarchical tree from flat list
  const buildTree = (items: BudgetWbs[]): BudgetWbs[] => {
    const map = new Map<string, BudgetWbs>();
    const roots: BudgetWbs[] = [];

    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        const parent = map.get(item.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const createItem = useMutation({
    mutationFn: async (data: WbsFormData) => {
      if (!revisionId) throw new Error('Revision ID required');
      
      // Get next ordem value
      const { data: existing } = await supabase
        .from('budget_wbs')
        .select('ordem')
        .eq('revision_id', revisionId)
        .eq('parent_id', data.parent_id || null)
        .order('ordem', { ascending: false })
        .limit(1);

      const nextOrdem = existing && existing.length > 0 ? existing[0].ordem + 1 : 0;

      const { data: newItem, error } = await supabase
        .from('budget_wbs')
        .insert({
          revision_id: revisionId,
          code: data.code,
          nome: data.nome,
          tipo: data.tipo,
          parent_id: data.parent_id || null,
          ordem: data.ordem ?? nextOrdem,
        })
        .select()
        .single();

      if (error) throw error;
      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', revisionId] });
      toast({ title: 'Item WBS criado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar item WBS', description: error.message, variant: 'destructive' });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: WbsFormData & { id: string }) => {
      const { error } = await supabase
        .from('budget_wbs')
        .update({
          code: data.code,
          nome: data.nome,
          tipo: data.tipo,
          parent_id: data.parent_id || null,
          ordem: data.ordem,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', revisionId] });
      toast({ title: 'Item WBS atualizado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar item WBS', description: error.message, variant: 'destructive' });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_wbs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', revisionId] });
      toast({ title: 'Item WBS excluído com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir item WBS', description: error.message, variant: 'destructive' });
    },
  });

  const flatItems = wbsQuery.data || [];
  const treeItems = buildTree(flatItems);

  return {
    items: flatItems,
    tree: treeItems,
    isLoading: wbsQuery.isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
}
