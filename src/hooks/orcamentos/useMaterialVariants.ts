import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface MaterialVariant {
  id: string;
  catalog_id: string;
  fabricante: string;
  sku: string | null;
  preco_ref: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface VariantFormData {
  fabricante: string;
  sku?: string | null;
  preco_ref: number;
  ativo?: boolean;
}

export function useMaterialVariants(catalogId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['material-variants', catalogId],
    queryFn: async () => {
      if (!catalogId) return [];
      
      const { data, error } = await supabase
        .from('material_catalog_variants')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('fabricante', { ascending: true });

      if (error) throw error;
      return data as MaterialVariant[];
    },
    enabled: !!catalogId,
  });

  const createVariant = useMutation({
    mutationFn: async (formData: VariantFormData) => {
      if (!catalogId) throw new Error('Catalog ID required');

      const { data, error } = await supabase
        .from('material_catalog_variants')
        .insert({
          catalog_id: catalogId,
          fabricante: formData.fabricante,
          sku: formData.sku ?? null,
          preco_ref: formData.preco_ref,
          ativo: formData.ativo ?? true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-variants', catalogId] });
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
      toast.success('Fabricante adicionado');
    },
    onError: (error: Error) => {
      if (error.message.includes('unique constraint')) {
        toast.error('Este fabricante já existe para este material');
      } else {
        toast.error(`Erro ao adicionar fabricante: ${error.message}`);
      }
    },
  });

  const updateVariant = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaterialVariant> & { id: string }) => {
      // Record price history if price changed
      if (updates.preco_ref !== undefined) {
        const existingVariant = variants.find(v => v.id === id);
        if (existingVariant && Math.abs(existingVariant.preco_ref - updates.preco_ref) > 0.001) {
          await supabase
            .from('material_variant_price_history')
            .insert({
              variant_id: id,
              old_price: existingVariant.preco_ref,
              new_price: updates.preco_ref,
              changed_by: user?.id,
            });
        }
      }

      const { data, error } = await supabase
        .from('material_catalog_variants')
        .update({ ...updates, updated_by: user?.id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-variants', catalogId] });
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
      toast.success('Preço atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_catalog_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-variants', catalogId] });
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
      toast.success('Fabricante removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    variants,
    isLoading,
    createVariant,
    updateVariant,
    deleteVariant,
  };
}

// Hook to get all variants for multiple catalog items (for display in grid)
export function useAllMaterialVariants() {
  const { data: variantsMap = new Map(), isLoading } = useQuery({
    queryKey: ['all-material-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_catalog_variants')
        .select('*')
        .eq('ativo', true)
        .order('fabricante', { ascending: true });

      if (error) throw error;

      // Group by catalog_id
      const map = new Map<string, MaterialVariant[]>();
      for (const variant of data as MaterialVariant[]) {
        if (!map.has(variant.catalog_id)) {
          map.set(variant.catalog_id, []);
        }
        map.get(variant.catalog_id)!.push(variant);
      }
      return map;
    },
  });

  return { variantsMap, isLoading };
}
