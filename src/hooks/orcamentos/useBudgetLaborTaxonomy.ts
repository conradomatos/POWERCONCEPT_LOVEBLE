import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Groups
export interface BudgetLaborGroup {
  id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

// Categories
export interface BudgetLaborCategory {
  id: string;
  group_id: string | null;
  nome: string;
  ordem: number;
  created_at: string;
}

// Tags
export interface BudgetLaborTag {
  id: string;
  nome: string;
  created_at: string;
}

export function useBudgetLaborGroups() {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['budget-labor-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_labor_groups')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome');

      if (error) throw error;
      return data as BudgetLaborGroup[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (nome: string) => {
      const nextOrdem = groups.length > 0 ? Math.max(...groups.map(g => g.ordem)) + 1 : 0;
      
      const { data, error } = await supabase
        .from('budget_labor_groups')
        .insert({ nome, ordem: nextOrdem })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-groups'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_labor_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-groups'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir grupo: ${error.message}`);
    },
  });

  const upsertGroup = async (nome: string): Promise<string> => {
    const existing = groups.find(g => g.nome.toLowerCase() === nome.toLowerCase());
    if (existing) return existing.id;

    const result = await createGroup.mutateAsync(nome);
    return result.id;
  };

  return { groups, isLoading, createGroup, deleteGroup, upsertGroup };
}

export function useBudgetLaborCategories(groupId?: string) {
  const queryClient = useQueryClient();

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['budget-labor-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_labor_categories')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome');

      if (error) throw error;
      return data as BudgetLaborCategory[];
    },
  });

  const categories = groupId 
    ? allCategories.filter(c => c.group_id === groupId)
    : allCategories;

  const createCategory = useMutation({
    mutationFn: async ({ nome, group_id }: { nome: string; group_id?: string }) => {
      const nextOrdem = allCategories.length > 0 ? Math.max(...allCategories.map(c => c.ordem)) + 1 : 0;
      
      const { data, error } = await supabase
        .from('budget_labor_categories')
        .insert({ nome, group_id: group_id || null, ordem: nextOrdem })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-categories'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_labor_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-categories'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir categoria: ${error.message}`);
    },
  });

  const upsertCategory = async (nome: string, groupId?: string): Promise<string> => {
    const existing = allCategories.find(
      c => c.nome.toLowerCase() === nome.toLowerCase() && c.group_id === (groupId || null)
    );
    if (existing) return existing.id;

    const result = await createCategory.mutateAsync({ nome, group_id: groupId });
    return result.id;
  };

  return { categories, allCategories, isLoading, createCategory, deleteCategory, upsertCategory };
}

export function useBudgetLaborTags() {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['budget-labor-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_labor_tags')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as BudgetLaborTag[];
    },
  });

  const createTag = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('budget_labor_tags')
        .insert({ nome })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-tags'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar tag: ${error.message}`);
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_labor_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-tags'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tag: ${error.message}`);
    },
  });

  const upsertTag = async (nome: string): Promise<string> => {
    const existing = tags.find(t => t.nome.toLowerCase() === nome.toLowerCase());
    if (existing) return existing.id;

    const result = await createTag.mutateAsync(nome);
    return result.id;
  };

  return { tags, isLoading, createTag, deleteTag, upsertTag };
}
