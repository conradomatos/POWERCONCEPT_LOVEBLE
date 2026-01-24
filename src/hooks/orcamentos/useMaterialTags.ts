import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialTag {
  id: string;
  nome: string;
  created_at: string;
}

export interface MaterialCatalogTag {
  material_id: string;
  tag_id: string;
}

export function useMaterialTags() {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['material-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_tags')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as MaterialTag[];
    },
  });

  const createTag = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('material_tags')
        .insert({ nome })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-tags'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe uma tag com este nome');
      } else {
        toast.error(`Erro ao criar tag: ${error.message}`);
      }
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-tags'] });
      toast.success('Tag removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover tag: ${error.message}`);
    },
  });

  // Upsert - create if not exists, return existing if exists
  const upsertTag = async (nome: string): Promise<string> => {
    const trimmed = nome.trim();
    const existing = tags.find(t => t.nome.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('material_tags')
      .insert({ nome: trimmed })
      .select('id')
      .single();

    if (error) {
      if (error.message.includes('duplicate')) {
        const { data: found } = await supabase
          .from('material_tags')
          .select('id')
          .ilike('nome', trimmed)
          .single();
        if (found) return found.id;
      }
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['material-tags'] });
    return data.id;
  };

  // Get tags for a material
  const getMaterialTags = async (materialId: string): Promise<MaterialTag[]> => {
    const { data, error } = await supabase
      .from('material_catalog_tags')
      .select('tag_id, material_tags!inner(id, nome, created_at)')
      .eq('material_id', materialId);

    if (error) throw error;
    return data?.map((d: any) => d.material_tags) || [];
  };

  // Set tags for a material (replace all)
  const setMaterialTags = async (materialId: string, tagIds: string[]): Promise<void> => {
    // Delete existing
    await supabase
      .from('material_catalog_tags')
      .delete()
      .eq('material_id', materialId);

    // Insert new
    if (tagIds.length > 0) {
      const { error } = await supabase
        .from('material_catalog_tags')
        .insert(tagIds.map(tag_id => ({ material_id: materialId, tag_id })));

      if (error) throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['material-catalog-tags', materialId] });
  };

  // Add a tag to a material
  const addTagToMaterial = async (materialId: string, tagId: string): Promise<void> => {
    const { error } = await supabase
      .from('material_catalog_tags')
      .insert({ material_id: materialId, tag_id: tagId });

    if (error && !error.message.includes('duplicate')) throw error;
    queryClient.invalidateQueries({ queryKey: ['material-catalog-tags', materialId] });
  };

  // Remove a tag from a material
  const removeTagFromMaterial = async (materialId: string, tagId: string): Promise<void> => {
    const { error } = await supabase
      .from('material_catalog_tags')
      .delete()
      .eq('material_id', materialId)
      .eq('tag_id', tagId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['material-catalog-tags', materialId] });
  };

  return {
    tags,
    isLoading,
    createTag,
    deleteTag,
    upsertTag,
    getMaterialTags,
    setMaterialTags,
    addTagToMaterial,
    removeTagFromMaterial,
  };
}

// Hook to get tags for a specific material
export function useMaterialCatalogTags(materialId?: string) {
  const { data: materialTags = [], isLoading } = useQuery({
    queryKey: ['material-catalog-tags', materialId],
    queryFn: async () => {
      if (!materialId) return [];
      
      const { data, error } = await supabase
        .from('material_catalog_tags')
        .select('tag_id, material_tags!inner(id, nome, created_at)')
        .eq('material_id', materialId);

      if (error) throw error;
      return data?.map((d: any) => d.material_tags as MaterialTag) || [];
    },
    enabled: !!materialId,
  });

  return { materialTags, isLoading };
}
