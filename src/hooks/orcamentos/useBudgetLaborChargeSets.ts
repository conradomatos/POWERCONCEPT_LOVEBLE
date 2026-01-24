import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BudgetLaborChargeSet {
  id: string;
  nome: string;
  descricao: string | null;
  encargos_sociais_pct: number;
  fgts_pct: number;
  inss_pct: number;
  outros_impostos_pct: number;
  provisao_ferias_pct: number;
  provisao_13o_pct: number;
  provisao_rescisao_pct: number;
  vale_transporte_pct: number;
  vale_refeicao_pct: number;
  plano_saude_pct: number;
  outros_beneficios_pct: number;
  total_encargos_pct: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetLaborChargeSetFormData {
  nome: string;
  descricao?: string | null;
  encargos_sociais_pct?: number;
  fgts_pct?: number;
  inss_pct?: number;
  outros_impostos_pct?: number;
  provisao_ferias_pct?: number;
  provisao_13o_pct?: number;
  provisao_rescisao_pct?: number;
  vale_transporte_pct?: number;
  vale_refeicao_pct?: number;
  plano_saude_pct?: number;
  outros_beneficios_pct?: number;
  ativo?: boolean;
}

export function useBudgetLaborChargeSets() {
  const queryClient = useQueryClient();

  const { data: chargeSets = [], isLoading } = useQuery({
    queryKey: ['budget-labor-charge-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_labor_charge_sets')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as BudgetLaborChargeSet[];
    },
  });

  const createChargeSet = useMutation({
    mutationFn: async (formData: BudgetLaborChargeSetFormData) => {
      const { data, error } = await supabase
        .from('budget_labor_charge_sets')
        .insert({
          nome: formData.nome,
          descricao: formData.descricao,
          encargos_sociais_pct: formData.encargos_sociais_pct ?? 0,
          fgts_pct: formData.fgts_pct ?? 0,
          inss_pct: formData.inss_pct ?? 0,
          outros_impostos_pct: formData.outros_impostos_pct ?? 0,
          provisao_ferias_pct: formData.provisao_ferias_pct ?? 0,
          provisao_13o_pct: formData.provisao_13o_pct ?? 0,
          provisao_rescisao_pct: formData.provisao_rescisao_pct ?? 0,
          vale_transporte_pct: formData.vale_transporte_pct ?? 0,
          vale_refeicao_pct: formData.vale_refeicao_pct ?? 0,
          plano_saude_pct: formData.plano_saude_pct ?? 0,
          outros_beneficios_pct: formData.outros_beneficios_pct ?? 0,
          ativo: formData.ativo ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-charge-sets'] });
      toast.success('Conjunto de encargos criado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conjunto: ${error.message}`);
    },
  });

  const updateChargeSet = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<BudgetLaborChargeSet> & { id: string }) => {
      const { total_encargos_pct, created_at, updated_at, ...updateData } = formData as any;

      const { data, error } = await supabase
        .from('budget_labor_charge_sets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-charge-sets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-labor-catalog'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar conjunto: ${error.message}`);
    },
  });

  const deleteChargeSet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_labor_charge_sets')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-charge-sets'] });
      toast.success('Conjunto desativado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desativar conjunto: ${error.message}`);
    },
  });

  return {
    chargeSets,
    isLoading,
    createChargeSet,
    updateChargeSet,
    deleteChargeSet,
  };
}
