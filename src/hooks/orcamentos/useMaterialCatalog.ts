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
  categoria: string | null; // Legacy field
  group_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  group?: { id: string; nome: string } | null;
  category?: { id: string; nome: string } | null;
  subcategory?: { id: string; nome: string } | null;
  tags?: { id: string; nome: string }[];
}

export interface CatalogFormData {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_ref?: number | null;
  hh_unit_ref?: number | null;
  categoria?: string | null;
  group_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  ativo?: boolean;
}

export function useMaterialCatalog() {
  const queryClient = useQueryClient();

  // List all catalog items with relations
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['material-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_catalog')
        .select(`
          *,
          group:material_groups(id, nome),
          category:material_categories(id, nome),
          subcategory:material_subcategories(id, nome)
        `)
        .order('codigo', { ascending: true });

      if (error) throw error;
      
      // Fetch tags for all items
      const ids = data.map(d => d.id);
      if (ids.length > 0) {
        const { data: tagsData } = await supabase
          .from('material_catalog_tags')
          .select('material_id, material_tags(id, nome)')
          .in('material_id', ids);

        const tagsMap = new Map<string, { id: string; nome: string }[]>();
        tagsData?.forEach((item: any) => {
          const materialId = item.material_id;
          if (!tagsMap.has(materialId)) {
            tagsMap.set(materialId, []);
          }
          if (item.material_tags) {
            tagsMap.get(materialId)!.push(item.material_tags);
          }
        });

        return data.map(item => ({
          ...item,
          tags: tagsMap.get(item.id) || [],
        })) as CatalogItem[];
      }

      return data as CatalogItem[];
    },
  });

  // Search catalog items
  const searchCatalog = async (term: string): Promise<CatalogItem[]> => {
    if (!term || term.length < 2) return [];
    
    const { data, error } = await supabase
      .from('material_catalog')
      .select(`
        *,
        group:material_groups(id, nome),
        category:material_categories(id, nome),
        subcategory:material_subcategories(id, nome)
      `)
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
          group_id: formData.group_id ?? null,
          category_id: formData.category_id ?? null,
          subcategory_id: formData.subcategory_id ?? null,
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
      // Remove joined data before update
      const { group, category, subcategory, tags, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('material_catalog')
        .update(cleanUpdates)
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
