import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LaborIncidenceCalcTipo } from './useLaborIncidenceCatalog';

export interface LaborRoleIncidenceCost {
  id: string;
  labor_role_id: string;
  incidence_item_id: string;
  ativo: boolean;
  obrigatorio: boolean;
  preco_unitario: number | null;
  qtd: number | null;
  meses: number | null;
  qtd_mes: number | null;
  valor_mensal: number | null;
  observacao: string | null;
  // Override flags
  has_preco_override: boolean;
  has_qtd_override: boolean;
  has_meses_override: boolean;
  has_qtd_mes_override: boolean;
  has_valor_mensal_override: boolean;
  // Item info
  item_codigo: string;
  item_descricao: string;
  calc_tipo: LaborIncidenceCalcTipo;
  // Group info
  group_id: string;
  group_codigo: string;
  group_nome: string;
  group_ordem: number;
  // Calculated
  custo_mensal_por_pessoa: number;
}

export interface LaborRoleIncidenceTotals {
  group_codigo: string;
  group_nome: string;
  total_grupo: number;
  total_geral: number;
}

export interface LaborRoleIncidenceUpdate {
  ativo?: boolean;
  obrigatorio?: boolean | null;
  preco_unitario_override?: number | null;
  qtd_override?: number | null;
  meses_override?: number | null;
  qtd_mes_override?: number | null;
  valor_mensal_override?: number | null;
  observacao?: string | null;
}

export function useLaborRoleIncidences(laborRoleId: string | null) {
  const queryClient = useQueryClient();

  // Fetch all incidence costs for a role via the view
  const { data: incidences, isLoading, refetch } = useQuery({
    queryKey: ['labor-role-incidences', laborRoleId],
    queryFn: async () => {
      if (!laborRoleId) return [];
      
      const { data, error } = await supabase
        .from('vw_labor_role_incidence_costs')
        .select('*')
        .eq('labor_role_id', laborRoleId)
        .order('group_ordem')
        .order('item_codigo');
      
      if (error) throw error;
      return data as LaborRoleIncidenceCost[];
    },
    enabled: !!laborRoleId,
  });

  // Fetch totals by group for a role
  const { data: totals, isLoading: totalsLoading, refetch: refetchTotals } = useQuery({
    queryKey: ['labor-role-incidence-totals', laborRoleId],
    queryFn: async () => {
      if (!laborRoleId) return [];
      
      const { data, error } = await supabase
        .rpc('get_labor_role_incidence_totals', { p_labor_role_id: laborRoleId });
      
      if (error) throw error;
      return data as LaborRoleIncidenceTotals[];
    },
    enabled: !!laborRoleId,
  });

  // Toggle item activation for a role
  const toggleItem = useMutation({
    mutationFn: async ({ itemId, ativo }: { itemId: string; ativo: boolean }) => {
      if (!laborRoleId) throw new Error('No labor role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('labor_role_incidence')
        .select('id')
        .eq('labor_role_id', laborRoleId)
        .eq('incidence_item_id', itemId)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('labor_role_incidence')
          .update({ ativo, updated_by: userData.user?.id })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('labor_role_incidence')
          .insert({
            labor_role_id: laborRoleId,
            incidence_item_id: itemId,
            ativo,
            created_by: userData.user?.id,
            updated_by: userData.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidences', laborRoleId] });
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidence-totals', laborRoleId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar item');
    },
  });

  // Update override values for an item
  const updateOverride = useMutation({
    mutationFn: async ({ 
      incidenceId, 
      itemId,
      updates 
    }: { 
      incidenceId: string | null; 
      itemId: string;
      updates: LaborRoleIncidenceUpdate;
    }) => {
      if (!laborRoleId) throw new Error('No labor role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      if (incidenceId) {
        // Update existing
        const { error } = await supabase
          .from('labor_role_incidence')
          .update({ ...updates, updated_by: userData.user?.id })
          .eq('id', incidenceId);
        
        if (error) throw error;
      } else {
        // Insert new with overrides
        const { error } = await supabase
          .from('labor_role_incidence')
          .insert({
            labor_role_id: laborRoleId,
            incidence_item_id: itemId,
            ativo: true,
            ...updates,
            created_by: userData.user?.id,
            updated_by: userData.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidences', laborRoleId] });
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidence-totals', laborRoleId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar override');
    },
  });

  // Reset all overrides to catalog defaults
  const resetOverrides = useMutation({
    mutationFn: async (incidenceId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('labor_role_incidence')
        .update({
          preco_unitario_override: null,
          qtd_override: null,
          meses_override: null,
          qtd_mes_override: null,
          valor_mensal_override: null,
          obrigatorio: null,
          observacao: null,
          updated_by: userData.user?.id,
        })
        .eq('id', incidenceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidences', laborRoleId] });
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidence-totals', laborRoleId] });
      toast.success('Valores resetados para padrão do catálogo');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao resetar valores');
    },
  });

  // Apply all catalog items to a role (initialize)
  const applyAllCatalogItems = useMutation({
    mutationFn: async () => {
      if (!laborRoleId) throw new Error('No labor role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      // Get all active catalog items
      const { data: catalogItems, error: catalogError } = await supabase
        .from('labor_incidence_items')
        .select('id, obrigatorio_default')
        .eq('ativo', true);
      
      if (catalogError) throw catalogError;
      
      // Get existing incidences for this role
      const { data: existing, error: existingError } = await supabase
        .from('labor_role_incidence')
        .select('incidence_item_id')
        .eq('labor_role_id', laborRoleId);
      
      if (existingError) throw existingError;
      
      const existingIds = new Set(existing?.map(e => e.incidence_item_id) ?? []);
      
      // Insert only items that don't exist yet
      const newItems = catalogItems
        ?.filter(item => !existingIds.has(item.id))
        .map(item => ({
          labor_role_id: laborRoleId,
          incidence_item_id: item.id,
          ativo: item.obrigatorio_default, // Auto-activate if mandatory
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        }));
      
      if (newItems && newItems.length > 0) {
        const { error: insertError } = await supabase
          .from('labor_role_incidence')
          .insert(newItems);
        
        if (insertError) throw insertError;
      }
      
      return newItems?.length ?? 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidences', laborRoleId] });
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidence-totals', laborRoleId] });
      if (count > 0) {
        toast.success(`${count} itens do catálogo aplicados`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aplicar itens do catálogo');
    },
  });

  // Apply template to a role
  const applyTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!laborRoleId) throw new Error('No labor role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      // Get template items
      const { data: templateItems, error: templateError } = await supabase
        .from('labor_incidence_template_items')
        .select('*')
        .eq('template_id', templateId);
      
      if (templateError) throw templateError;
      if (!templateItems?.length) return 0;
      
      // Get existing incidences for this role
      const { data: existing, error: existingError } = await supabase
        .from('labor_role_incidence')
        .select('incidence_item_id')
        .eq('labor_role_id', laborRoleId);
      
      if (existingError) throw existingError;
      
      const existingIds = new Set(existing?.map(e => e.incidence_item_id) ?? []);
      
      // Insert only items that don't exist yet
      const newItems = templateItems
        .filter(item => !existingIds.has(item.incidence_item_id))
        .map(item => ({
          labor_role_id: laborRoleId,
          incidence_item_id: item.incidence_item_id,
          ativo: item.ativo_default,
          qtd_override: item.qtd_override,
          meses_override: item.meses_override,
          qtd_mes_override: item.qtd_mes_override,
          preco_unitario_override: item.preco_unitario_override,
          valor_mensal_override: item.valor_mensal_override,
          observacao: item.observacao,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        }));
      
      if (newItems.length > 0) {
        const { error: insertError } = await supabase
          .from('labor_role_incidence')
          .insert(newItems);
        
        if (insertError) throw insertError;
      }
      
      return newItems.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidences', laborRoleId] });
      queryClient.invalidateQueries({ queryKey: ['labor-role-incidence-totals', laborRoleId] });
      if (count > 0) {
        toast.success(`${count} itens do template aplicados`);
      } else {
        toast.info('Todos os itens do template já existem para esta função');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aplicar template');
    },
  });

  return {
    incidences: incidences ?? [],
    totals: totals ?? [],
    isLoading,
    totalsLoading,
    refetch,
    refetchTotals,
    toggleItem,
    updateOverride,
    resetOverrides,
    applyAllCatalogItems,
    applyTemplate,
  };
}
