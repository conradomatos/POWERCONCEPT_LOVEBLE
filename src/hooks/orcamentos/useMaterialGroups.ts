import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialGroup {
  id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

export function useMaterialGroups() {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['material-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_groups')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as MaterialGroup[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (nome: string) => {
      const maxOrdem = groups.reduce((max, g) => Math.max(max, g.ordem), 0);
      const { data, error } = await supabase
        .from('material_groups')
        .insert({ nome, ordem: maxOrdem + 1 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-groups'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe um grupo com este nome');
      } else {
        toast.error(`Erro ao criar grupo: ${error.message}`);
      }
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaterialGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('material_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-groups'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-groups'] });
      toast.success('Grupo removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover grupo: ${error.message}`);
    },
  });

  // Upsert - create if not exists, return existing if exists
  const upsertGroup = async (nome: string): Promise<string> => {
    const existing = groups.find(g => g.nome.toLowerCase() === nome.toLowerCase());
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('material_groups')
      .insert({ nome })
      .select('id')
      .single();

    if (error) {
      // Check if duplicate error (concurrent insert)
      if (error.message.includes('duplicate')) {
        const { data: found } = await supabase
          .from('material_groups')
          .select('id')
          .ilike('nome', nome)
          .single();
        if (found) return found.id;
      }
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['material-groups'] });
    return data.id;
  };

  return {
    groups,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    upsertGroup,
  };
}
