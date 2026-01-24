import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LaborIncidenceCalcTipo } from './useLaborIncidenceCatalog';

// Row from vw_labor_incidence_by_role
export interface LaborIncidenceByRole {
  item_id: string;
  item_codigo: string;
  item_descricao: string;
  calc_tipo: LaborIncidenceCalcTipo;
  group_id: string;
  group_codigo: string;
  group_nome: string;
  group_ordem: number;
  role_id: string;
  role_codigo: string;
  role_nome: string;
  rule_id: string | null;
  // Final calculated values
  qty_final: number | null;
  unit_price_final: number | null;
  months_factor_final: number | null;
  qtd_mes_final: number | null;
  is_applicable_final: boolean;
  is_mandatory_final: boolean;
  custo_mensal_pessoa_final: number;
  override_notes: string | null;
  // Raw override values
  override_is_applicable: boolean | null;
  override_is_mandatory: boolean | null;
  override_qty: number | null;
  override_unit_price: number | null;
  override_months_factor: number | null;
  // Catalog defaults
  valor_mensal_default: number | null;
  preco_unitario_default: number | null;
  qtd_default: number | null;
  meses_default: number | null;
  qtd_mes_default: number | null;
}

export interface RoleRuleUpdate {
  is_applicable?: boolean | null;
  is_mandatory?: boolean | null;
  override_qty?: number | null;
  override_unit_price?: number | null;
  override_months_factor?: number | null;
  override_notes?: string | null;
}

// Fetch all incidence items for a specific role
export function useLaborIncidenceByRole(roleId: string | null) {
  return useQuery({
    queryKey: ['labor-incidence-by-role', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      
      const { data, error } = await supabase
        .from('vw_labor_incidence_by_role')
        .select('*')
        .eq('role_id', roleId)
        .order('group_ordem')
        .order('item_codigo');
      
      if (error) throw error;
      return data as LaborIncidenceByRole[];
    },
    enabled: !!roleId,
  });
}

// Hook for managing role rules
export function useLaborIncidenceRoleRules(roleId: string | null) {
  const queryClient = useQueryClient();

  // Upsert rule (create or update)
  const upsertRule = useMutation({
    mutationFn: async ({ 
      itemId, 
      ruleId,
      updates 
    }: { 
      itemId: string; 
      ruleId: string | null;
      updates: RoleRuleUpdate;
    }) => {
      if (!roleId) throw new Error('No role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      if (ruleId) {
        // Update existing rule
        const { error } = await supabase
          .from('labor_incidence_role_rules')
          .update({ 
            ...updates, 
            updated_by: userData.user?.id 
          })
          .eq('id', ruleId);
        
        if (error) throw error;
      } else {
        // Insert new rule
        const { error } = await supabase
          .from('labor_incidence_role_rules')
          .insert({
            role_id: roleId,
            incidence_item_id: itemId,
            ...updates,
            created_by: userData.user?.id,
            updated_by: userData.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-by-role', roleId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar regra');
    },
  });

  // Toggle applicable status
  const toggleApplicable = useMutation({
    mutationFn: async ({ 
      itemId, 
      ruleId,
      isApplicable 
    }: { 
      itemId: string; 
      ruleId: string | null;
      isApplicable: boolean;
    }) => {
      if (!roleId) throw new Error('No role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      if (ruleId) {
        const { error } = await supabase
          .from('labor_incidence_role_rules')
          .update({ 
            is_applicable: isApplicable, 
            updated_by: userData.user?.id 
          })
          .eq('id', ruleId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('labor_incidence_role_rules')
          .insert({
            role_id: roleId,
            incidence_item_id: itemId,
            is_applicable: isApplicable,
            created_by: userData.user?.id,
            updated_by: userData.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-by-role', roleId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar aplicabilidade');
    },
  });

  // Toggle mandatory status
  const toggleMandatory = useMutation({
    mutationFn: async ({ 
      itemId, 
      ruleId,
      isMandatory 
    }: { 
      itemId: string; 
      ruleId: string | null;
      isMandatory: boolean;
    }) => {
      if (!roleId) throw new Error('No role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      if (ruleId) {
        const { error } = await supabase
          .from('labor_incidence_role_rules')
          .update({ 
            is_mandatory: isMandatory, 
            updated_by: userData.user?.id 
          })
          .eq('id', ruleId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('labor_incidence_role_rules')
          .insert({
            role_id: roleId,
            incidence_item_id: itemId,
            is_mandatory: isMandatory,
            created_by: userData.user?.id,
            updated_by: userData.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-by-role', roleId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar obrigatoriedade');
    },
  });

  // Reset rule to defaults (delete the rule)
  const resetRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('labor_incidence_role_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-by-role', roleId] });
      toast.success('Regra resetada para padrão do catálogo');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao resetar regra');
    },
  });

  // Seed default rules for a role (base "Campo")
  const seedCampoDefaults = useMutation({
    mutationFn: async () => {
      if (!roleId) throw new Error('No role selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      // Items that should be marked as applicable + mandatory for "Campo" base
      const campoItems = ['A1', 'A3', 'B1', 'B2', 'C2', 'C3', 'C4', 'C5', 'C6', 'C10', 'C13', 'C19', 'D1', 'D2', 'D3'];
      
      // Get item IDs for these codes
      const { data: items, error: itemsError } = await supabase
        .from('labor_incidence_items')
        .select('id, codigo')
        .eq('ativo', true)
        .in('codigo', campoItems);
      
      if (itemsError) throw itemsError;
      
      if (!items || items.length === 0) {
        toast.info('Nenhum item encontrado para o template Campo');
        return 0;
      }
      
      // Get existing rules for this role
      const { data: existingRules, error: existingError } = await supabase
        .from('labor_incidence_role_rules')
        .select('incidence_item_id')
        .eq('role_id', roleId);
      
      if (existingError) throw existingError;
      
      const existingItemIds = new Set(existingRules?.map(r => r.incidence_item_id) ?? []);
      
      // Insert only new rules
      const newRules = items
        .filter(item => !existingItemIds.has(item.id))
        .map(item => ({
          role_id: roleId,
          incidence_item_id: item.id,
          is_applicable: true,
          is_mandatory: true,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        }));
      
      if (newRules.length > 0) {
        const { error: insertError } = await supabase
          .from('labor_incidence_role_rules')
          .insert(newRules);
        
        if (insertError) throw insertError;
      }
      
      return newRules.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['labor-incidence-by-role', roleId] });
      if (count > 0) {
        toast.success(`${count} regras do template "Campo" aplicadas`);
      } else {
        toast.info('Todas as regras do template já existem para esta função');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aplicar template Campo');
    },
  });

  return {
    upsertRule,
    toggleApplicable,
    toggleMandatory,
    resetRule,
    seedCampoDefaults,
  };
}
