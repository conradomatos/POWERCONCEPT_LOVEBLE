import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type LaborRoleCatalogItem = Database['public']['Tables']['labor_role_catalog']['Row'];

export interface LaborRoleCatalogFormData {
  funcao: string;
  salario_base_ref: number;
  carga_horaria_ref?: number;
  modalidade?: 'CLT' | 'PACOTE';
}

export function useLaborRoleCatalog() {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['labor-role-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_role_catalog')
        .select('*')
        .order('funcao');

      if (error) throw error;
      return data as LaborRoleCatalogItem[];
    },
  });

  const createRole = useMutation({
    mutationFn: async (formData: LaborRoleCatalogFormData) => {
      const { data, error } = await supabase
        .from('labor_role_catalog')
        .insert({
          funcao: formData.funcao,
          salario_base_ref: formData.salario_base_ref,
          carga_horaria_ref: formData.carga_horaria_ref ?? 220,
          modalidade: formData.modalidade ?? 'CLT',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-catalog'] });
      toast.success('Função adicionada ao catálogo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar função: ${error.message}`);
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<LaborRoleCatalogItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('labor_role_catalog')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-catalog'] });
      toast.success('Função atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar função: ${error.message}`);
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('labor_role_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-catalog'] });
      toast.success('Função removida do catálogo');
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
