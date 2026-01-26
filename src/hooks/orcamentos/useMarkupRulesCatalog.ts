import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarkupRuleSet {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  items?: MarkupRuleItem[];
}

export interface MarkupRuleItem {
  id: string;
  set_id: string;
  markup_pct: number;
  allow_per_wbs: boolean;
}

export interface MarkupRuleSetFormData {
  nome: string;
  descricao?: string | null;
}

export interface MarkupRuleItemFormData {
  set_id: string;
  markup_pct?: number;
  allow_per_wbs?: boolean;
}

export function useMarkupRulesCatalog() {
  const queryClient = useQueryClient();

  // Fetch all markup rule sets with their items
  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['markup-rule-sets-catalog'],
    queryFn: async () => {
      const { data: setsData, error: setsError } = await supabase
        .from('markup_rule_sets')
        .select('*')
        .order('nome');

      if (setsError) throw setsError;

      // Fetch items for all sets
      const { data: itemsData, error: itemsError } = await supabase
        .from('markup_rules_catalog')
        .select('*');

      if (itemsError) throw itemsError;

      // Group items by set_id
      const itemsBySet: Record<string, MarkupRuleItem[]> = {};
      (itemsData || []).forEach((item: MarkupRuleItem) => {
        if (!itemsBySet[item.set_id]) itemsBySet[item.set_id] = [];
        itemsBySet[item.set_id].push(item);
      });

      return setsData.map((set: MarkupRuleSet) => ({
        ...set,
        items: itemsBySet[set.id] || [],
      })) as MarkupRuleSet[];
    },
  });

  // Create a new markup rule set
  const createSet = useMutation({
    mutationFn: async (formData: MarkupRuleSetFormData) => {
      const { data, error } = await supabase
        .from('markup_rule_sets')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markup-rule-sets-catalog'] });
      toast.success('Conjunto de markup criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conjunto: ${error.message}`);
    },
  });

  // Update a markup rule set
  const updateSet = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<MarkupRuleSet> & { id: string }) => {
      const { items, created_at, ...updateData } = formData as any;
      const { data, error } = await supabase
        .from('markup_rule_sets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markup-rule-sets-catalog'] });
      toast.success('Conjunto atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar conjunto: ${error.message}`);
    },
  });

  // Delete a markup rule set
  const deleteSet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('markup_rule_sets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markup-rule-sets-catalog'] });
      toast.success('Conjunto removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover conjunto: ${error.message}`);
    },
  });

  // Update markup item (single record per set)
  const upsertItem = useMutation({
    mutationFn: async (formData: MarkupRuleItemFormData) => {
      const { data, error } = await supabase
        .from('markup_rules_catalog')
        .upsert({
          set_id: formData.set_id,
          markup_pct: formData.markup_pct ?? 0,
          allow_per_wbs: formData.allow_per_wbs ?? false,
        }, { onConflict: 'set_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markup-rule-sets-catalog'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar markup: ${error.message}`);
    },
  });

  return {
    sets,
    isLoading,
    createSet,
    updateSet,
    deleteSet,
    upsertItem,
  };
}
