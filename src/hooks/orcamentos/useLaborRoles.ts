import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaborRole {
  id: string;
  revision_id: string;
  catalog_id: string | null;
  funcao: string;
  salario_base: number;
  carga_horaria_mensal: number;
  modalidade: 'CLT' | 'PACOTE';
  ativo: boolean;
  created_at: string;
  // Campos da view (catálogo)
  salario_referencia?: number | null;
  from_catalog?: boolean;
}

export interface LaborRoleFormData {
  catalog_id?: string;
  funcao: string;
  salario_base: number;
  carga_horaria_mensal: number;
  modalidade: 'CLT' | 'PACOTE';
  ativo?: boolean;
}

export function useLaborRoles(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['labor-roles', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      
      // Try the view first, fallback to table
      const { data: viewData, error: viewError } = await supabase
        .from('vw_budget_labor_roles')
        .select('*')
        .eq('revision_id', revisionId)
        .order('funcao');

      if (!viewError && viewData) {
        return viewData as LaborRole[];
      }
      
      // Fallback to direct table query
      const { data, error } = await supabase
        .from('labor_roles')
        .select('*')
        .eq('revision_id', revisionId)
        .order('funcao');

      if (error) throw error;
      return data as LaborRole[];
    },
    enabled: !!revisionId,
  });

  // Import from catalog
  const createFromCatalog = useMutation({
    mutationFn: async ({ catalogId, salario_base }: { catalogId: string; salario_base: number }) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      // Get catalog item for snapshot fields
      const { data: catalogItem, error: catalogError } = await supabase
        .from('labor_role_catalog')
        .select('*')
        .eq('id', catalogId)
        .single();

      if (catalogError) throw catalogError;

      // Check if already exists
      const existing = roles.find(r => r.catalog_id === catalogId);
      if (existing) {
        throw new Error('Esta função já foi adicionada a este orçamento');
      }

      const { data, error } = await supabase
        .from('labor_roles')
        .insert({
          revision_id: revisionId,
          catalog_id: catalogId,
          // Snapshot fields from catalog
          funcao: catalogItem.funcao,
          carga_horaria_mensal: catalogItem.carga_horaria_ref || 220,
          modalidade: catalogItem.modalidade,
          // Budget-specific field
          salario_base,
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-roles', revisionId] });
      toast.success('Função adicionada do catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar função: ${error.message}`);
    },
  });

  // Create manual role (without catalog)
  const createRole = useMutation({
    mutationFn: async (formData: LaborRoleFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data, error } = await supabase
        .from('labor_roles')
        .insert({
          revision_id: revisionId,
          catalog_id: formData.catalog_id || null,
          funcao: formData.funcao,
          salario_base: formData.salario_base,
          carga_horaria_mensal: formData.carga_horaria_mensal,
          modalidade: formData.modalidade,
          ativo: formData.ativo ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-roles', revisionId] });
      toast.success('Função adicionada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar função: ${error.message}`);
    },
  });

  // Update only budget-specific fields (salario_base)
  const updateRole = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<LaborRole> & { id: string }) => {
      const { data, error } = await supabase
        .from('labor_roles')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-roles', revisionId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar função: ${error.message}`);
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('labor_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-roles', revisionId] });
      toast.success('Função removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover função: ${error.message}`);
    },
  });

  return {
    roles,
    isLoading,
    createRole,
    createFromCatalog,
    updateRole,
    deleteRole,
  };
}
