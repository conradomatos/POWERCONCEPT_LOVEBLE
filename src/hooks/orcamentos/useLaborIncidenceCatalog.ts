import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LaborIncidenceCalcTipo = 'RATEIO_MESES' | 'MENSAL';

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
  calc_tipo: LaborIncidenceCalcTipo;
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
  calc_tipo: LaborIncidenceCalcTipo;
  preco_unitario_default?: number | null;
  qtd_default?: number | null;
  meses_default?: number | null;
  qtd_mes_default?: number | null;
  valor_mensal_default?: number | null;
  obrigatorio_default?: boolean;
  observacao_default?: string | null;
  ativo?: boolean;
}

export interface LaborIncidenceTemplate {
  id: string;
  codigo: string;
  nome: string;
  tipo_mo: 'MOD' | 'MOI';
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LaborIncidenceItemPrice {
  id: string;
  incidence_item_id: string;
  empresa_id: string | null;
  regiao_id: string | null;
  preco_unitario: number;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
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

export function useLaborIncidenceTemplates() {
  return useQuery({
    queryKey: ['labor-incidence-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_incidence_templates')
        .select('*')
        .eq('ativo', true)
        .order('codigo');
      
      if (error) throw error;
      return data as LaborIncidenceTemplate[];
    },
  });
}

export function useLaborIncidenceItemPrices(itemId: string | null, empresaId: string | null, regiaoId: string | null) {
  return useQuery({
    queryKey: ['labor-incidence-item-prices', itemId, empresaId, regiaoId],
    queryFn: async () => {
      if (!itemId) return [];
      
      let query = supabase
        .from('labor_incidence_item_prices')
        .select('*')
        .eq('incidence_item_id', itemId)
        .eq('ativo', true);
      
      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }
      if (regiaoId) {
        query = query.eq('regiao_id', regiaoId);
      }
      
      const { data, error } = await query.order('vigencia_inicio', { ascending: false });
      
      if (error) throw error;
      return data as LaborIncidenceItemPrice[];
    },
    enabled: !!itemId,
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

  // Price management
  const createPrice = useMutation({
    mutationFn: async (price: Omit<LaborIncidenceItemPrice, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('labor_incidence_item_prices')
        .insert({
          ...price,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-item-prices'] });
      toast.success('Preço cadastrado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cadastrar preço');
    },
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaborIncidenceItemPrice> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('labor_incidence_item_prices')
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
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-item-prices'] });
      toast.success('Preço atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar preço');
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
    createPrice,
    updatePrice,
  };
}
