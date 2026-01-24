import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialSubcategory {
  id: string;
  category_id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

export function useMaterialSubcategories(categoryId?: string) {
  const queryClient = useQueryClient();

  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ['material-subcategories', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('material_subcategories')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialSubcategory[];
    },
  });

  // All subcategories (no filter)
  const { data: allSubcategories = [] } = useQuery({
    queryKey: ['material-subcategories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_subcategories')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as MaterialSubcategory[];
    },
  });

  const createSubcategory = useMutation({
    mutationFn: async ({ category_id, nome }: { category_id: string; nome: string }) => {
      const maxOrdem = subcategories.reduce((max, s) => Math.max(max, s.ordem), 0);
      const { data, error } = await supabase
        .from('material_subcategories')
        .insert({ category_id, nome, ordem: maxOrdem + 1 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['material-subcategories-all'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe uma subcategoria com este nome nesta categoria');
      } else {
        toast.error(`Erro ao criar subcategoria: ${error.message}`);
      }
    },
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaterialSubcategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('material_subcategories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['material-subcategories-all'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar subcategoria: ${error.message}`);
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['material-subcategories-all'] });
      toast.success('Subcategoria removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover subcategoria: ${error.message}`);
    },
  });

  // Upsert - create if not exists, return existing if exists
  const upsertSubcategory = async (category_id: string, nome: string): Promise<string> => {
    const existing = allSubcategories.find(
      s => s.category_id === category_id && s.nome.toLowerCase() === nome.toLowerCase()
    );
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('material_subcategories')
      .insert({ category_id, nome })
      .select('id')
      .single();

    if (error) {
      if (error.message.includes('duplicate')) {
        const { data: found } = await supabase
          .from('material_subcategories')
          .select('id')
          .eq('category_id', category_id)
          .ilike('nome', nome)
          .single();
        if (found) return found.id;
      }
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['material-subcategories'] });
    queryClient.invalidateQueries({ queryKey: ['material-subcategories-all'] });
    return data.id;
  };

  return {
    subcategories,
    allSubcategories,
    isLoading,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    upsertSubcategory,
  };
}
