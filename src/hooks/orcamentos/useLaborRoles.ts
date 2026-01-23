import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaborRole {
  id: string;
  revision_id: string;
  funcao: string;
  salario_base: number;
  carga_horaria_mensal: number;
  modalidade: 'CLT' | 'PACOTE';
  ativo: boolean;
  created_at: string;
}

export interface LaborRoleFormData {
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

  const createRole = useMutation({
    mutationFn: async (formData: LaborRoleFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      
      const { data, error } = await supabase
        .from('labor_roles')
        .insert({
          revision_id: revisionId,
          ...formData,
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
      toast.success('Função atualizada com sucesso');
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
    updateRole,
    deleteRole,
  };
}
