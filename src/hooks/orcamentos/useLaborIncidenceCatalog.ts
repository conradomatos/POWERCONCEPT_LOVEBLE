import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaborIncidenceGroup {
  id: string;
  codigo: string;
  nome: string;
  ordem: number;
}

export interface LaborIncidenceItem {
  id: string;
  group_id: string;
  codigo: string;
  descricao: string;
  calc_tipo: 'RATEIO_MESES' | 'MENSAL';
  preco_unitario_default: number | null;
  qtd_default: number | null;
  meses_default: number | null;
  qtd_mes_default: number | null;
  valor_mensal_default: number | null;
  obrigatorio_default: boolean;
  observacao_default: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Joined from group
  group_codigo?: string;
  group_nome?: string;
  group_ordem?: number;
}

export interface LaborIncidenceItemInsert {
  group_id: string;
  codigo: string;
  descricao: string;
  calc_tipo: 'RATEIO_MESES' | 'MENSAL';
  preco_unitario_default?: number | null;
  qtd_default?: number | null;
  meses_default?: number | null;
  qtd_mes_default?: number | null;
  valor_mensal_default?: number | null;
  obrigatorio_default?: boolean;
  observacao_default?: string | null;
  ativo?: boolean;
}

export function useLaborIncidenceGroups() {
  return useQuery({
    queryKey: ['labor-incidence-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_incidence_groups')
        .select('*')
        .order('ordem');
      
      if (error) throw error;
      return data as LaborIncidenceGroup[];
    },
  });
}

export function useLaborIncidenceItems() {
  return useQuery({
    queryKey: ['labor-incidence-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_incidence_items')
        .select(`
          *,
          group:labor_incidence_groups!inner(
            codigo,
            nome,
            ordem
          )
        `)
        .eq('ativo', true)
        .order('codigo');
      
      if (error) throw error;
      
      return (data ?? []).map((item: any) => ({
        ...item,
        group_codigo: item.group?.codigo,
        group_nome: item.group?.nome,
        group_ordem: item.group?.ordem,
      })) as LaborIncidenceItem[];
    },
  });
}

export function useLaborIncidenceCatalog() {
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: async (item: LaborIncidenceItemInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('labor_incidence_items')
        .insert({
          ...item,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-items'] });
      toast.success('Item de incidência criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar item');
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaborIncidenceItem> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('labor_incidence_items')
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
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-items'] });
      toast.success('Item atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar item');
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('labor_incidence_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-items'] });
      toast.success('Item excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir item');
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
  };
}
