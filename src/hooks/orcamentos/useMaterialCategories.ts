import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialCategory {
  id: string;
  group_id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

export function useMaterialCategories(groupId?: string) {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['material-categories', groupId],
    queryFn: async () => {
      let query = supabase
        .from('material_categories')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialCategory[];
    },
  });

  // All categories (no filter)
  const { data: allCategories = [] } = useQuery({
    queryKey: ['material-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_categories')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as MaterialCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async ({ group_id, nome }: { group_id: string; nome: string }) => {
      const maxOrdem = categories.reduce((max, c) => Math.max(max, c.ordem), 0);
      const { data, error } = await supabase
        .from('material_categories')
        .insert({ group_id, nome, ordem: maxOrdem + 1 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-categories'] });
      queryClient.invalidateQueries({ queryKey: ['material-categories-all'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe uma categoria com este nome neste grupo');
      } else {
        toast.error(`Erro ao criar categoria: ${error.message}`);
      }
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaterialCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('material_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-categories'] });
      queryClient.invalidateQueries({ queryKey: ['material-categories-all'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-categories'] });
      queryClient.invalidateQueries({ queryKey: ['material-categories-all'] });
      toast.success('Categoria removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover categoria: ${error.message}`);
    },
  });

  // Upsert - create if not exists, return existing if exists
  const upsertCategory = async (group_id: string, nome: string): Promise<string> => {
    const existing = allCategories.find(
      c => c.group_id === group_id && c.nome.toLowerCase() === nome.toLowerCase()
    );
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('material_categories')
      .insert({ group_id, nome })
      .select('id')
      .single();

    if (error) {
      if (error.message.includes('duplicate')) {
        const { data: found } = await supabase
          .from('material_categories')
          .select('id')
          .eq('group_id', group_id)
          .ilike('nome', nome)
          .single();
        if (found) return found.id;
      }
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['material-categories'] });
    queryClient.invalidateQueries({ queryKey: ['material-categories-all'] });
    return data.id;
  };

  return {
    categories,
    allCategories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    upsertCategory,
  };
}
