import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CatalogItem {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_ref: number | null;
  hh_unit_ref: number | null;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogFormData {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_ref?: number | null;
  hh_unit_ref?: number | null;
  categoria?: string | null;
  ativo?: boolean;
}

export function useMaterialCatalog() {
  const queryClient = useQueryClient();

  // List all catalog items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['material-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_catalog')
        .select('*')
        .order('codigo', { ascending: true });

      if (error) throw error;
      return data as CatalogItem[];
    },
  });

  // Search catalog items
  const searchCatalog = async (term: string): Promise<CatalogItem[]> => {
    if (!term || term.length < 2) return [];
    
    const { data, error } = await supabase
      .from('material_catalog')
      .select('*')
      .eq('ativo', true)
      .or(`codigo.ilike.%${term}%,descricao.ilike.%${term}%`)
      .limit(20);

    if (error) {
      console.error('Error searching catalog:', error);
      return [];
    }
    return data as CatalogItem[];
  };

  // Create catalog item
  const createItem = useMutation({
    mutationFn: async (formData: CatalogFormData) => {
      const { data, error } = await supabase
        .from('material_catalog')
        .insert({
          codigo: formData.codigo,
          descricao: formData.descricao,
          unidade: formData.unidade,
          preco_ref: formData.preco_ref ?? null,
          hh_unit_ref: formData.hh_unit_ref ?? null,
          categoria: formData.categoria ?? null,
          ativo: formData.ativo ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
      toast.success('Item adicionado ao catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });

  // Update catalog item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CatalogItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('material_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  // Delete catalog item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
      toast.success('Item removido do catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover item: ${error.message}`);
    },
  });

  return {
    items,
    isLoading,
    searchCatalog,
    createItem,
    updateItem,
    deleteItem,
  };
}
