import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface EquipmentCatalogItem {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_mensal_ref: number;
  group_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  ativo: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  // From view
  group_nome?: string | null;
  category_nome?: string | null;
  subcategory_nome?: string | null;
  hierarquia_path?: string | null;
  tags?: string[] | null;
}

export interface EquipmentCatalogFormData {
  codigo: string;
  descricao: string;
  unidade?: string;
  preco_mensal_ref?: number;
  group_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  ativo?: boolean;
  observacao?: string | null;
}

export interface EquipmentGroup {
  id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

export interface EquipmentCategory {
  id: string;
  group_id: string | null;
  nome: string;
  ordem: number;
  created_at: string;
}

export interface EquipmentSubcategory {
  id: string;
  category_id: string | null;
  nome: string;
  ordem: number;
  created_at: string;
}

export interface EquipmentTag {
  id: string;
  nome: string;
  created_at: string;
}

export function useEquipmentCatalogNew() {
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  
  const canEdit = roles.includes('super_admin') || roles.includes('catalog_manager');

  // Fetch all catalog items from view
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment-catalog-new'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_equipment_catalog')
        .select('*')
        .order('codigo');

      if (error) throw error;
      return data as EquipmentCatalogItem[];
    },
  });

  // Create item
  const createItem = useMutation({
    mutationFn: async (formData: EquipmentCatalogFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('equipment_catalog')
        .insert({
          ...formData,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
      toast.success('Equipamento adicionado ao catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EquipmentCatalogItem> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('equipment_catalog')
        .update({
          ...updates,
          updated_by: userData.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
      toast.success('Equipamento removido do catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Batch update for inline editing
  const batchUpdate = useMutation({
    mutationFn: async (updates: Array<Partial<EquipmentCatalogItem> & { id: string }>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      for (const { id, ...fields } of updates) {
        const { error } = await supabase
          .from('equipment_catalog')
          .update({ ...fields, updated_by: userData.user?.id })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar alterações: ${error.message}`);
    },
  });

  // Search catalog for autocomplete
  const searchCatalog = async (term: string): Promise<EquipmentCatalogItem[]> => {
    if (!term || term.length < 2) return [];
    
    const { data, error } = await supabase
      .from('vw_equipment_catalog')
      .select('*')
      .or(`codigo.ilike.%${term}%,descricao.ilike.%${term}%`)
      .eq('ativo', true)
      .limit(20);

    if (error) {
      console.error('Error searching equipment catalog:', error);
      return [];
    }
    return data as EquipmentCatalogItem[];
  };

  return {
    items,
    isLoading,
    canEdit,
    createItem,
    updateItem,
    deleteItem,
    batchUpdate,
    searchCatalog,
  };
}

// Hook for equipment groups
export function useEquipmentGroups() {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['equipment-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_groups')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as EquipmentGroup[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('equipment_groups')
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-groups'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from('equipment_groups')
        .update({ nome })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-groups'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_groups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-groups'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  return { groups, isLoading, createGroup, updateGroup, deleteGroup };
}

// Hook for equipment categories
export function useEquipmentCategories() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_categories')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as EquipmentCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async ({ nome, group_id }: { nome: string; group_id: string }) => {
      const { data, error } = await supabase
        .from('equipment_categories')
        .insert({ nome, group_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from('equipment_categories')
        .update({ nome })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  return { categories, isLoading, createCategory, updateCategory, deleteCategory };
}

// Hook for equipment subcategories
export function useEquipmentSubcategories() {
  const queryClient = useQueryClient();

  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ['equipment-subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_subcategories')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as EquipmentSubcategory[];
    },
  });

  const createSubcategory = useMutation({
    mutationFn: async ({ nome, category_id }: { nome: string; category_id: string }) => {
      const { data, error } = await supabase
        .from('equipment_subcategories')
        .insert({ nome, category_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from('equipment_subcategories')
        .update({ nome })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_subcategories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
    },
  });

  return { subcategories, isLoading, createSubcategory, updateSubcategory, deleteSubcategory };
}

// Hook for equipment tags
export function useEquipmentTags() {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['equipment-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_tags')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as EquipmentTag[];
    },
  });

  const createTag = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('equipment_tags')
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-tags'] });
    },
  });

  return { tags, isLoading, createTag };
}
