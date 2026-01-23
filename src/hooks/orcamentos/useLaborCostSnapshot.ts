import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LaborRole } from './useLaborRoles';
import type { LaborParameters } from './useLaborParameters';

export interface LaborCostSnapshot {
  id: string;
  revision_id: string;
  labor_role_id: string;
  custo_hora_normal: number;
  custo_hora_he50: number;
  custo_hora_he100: number;
  memoria_json: Record<string, number>;
  updated_at: string;
}

export interface LaborCostWithRole extends LaborCostSnapshot {
  labor_role?: LaborRole;
}

export function useLaborCostSnapshot(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['labor-cost-snapshot', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('labor_cost_snapshot')
        .select(`
          *,
          labor_role:labor_roles(*)
        `)
        .eq('revision_id', revisionId);

      if (error) throw error;
      return data as LaborCostWithRole[];
    },
    enabled: !!revisionId,
  });

  const calculateCosts = useMutation({
    mutationFn: async ({ roles, parameters }: { roles: LaborRole[], parameters: LaborParameters | null }) => {
      if (!revisionId) throw new Error('Revisão não selecionada');
      if (!parameters) throw new Error('Parâmetros de MO não configurados');

      const results = roles.filter(r => r.ativo).map((role) => {
        // Base calculation
        const salarioComEncargos = role.salario_base * (1 + parameters.encargos_pct / 100);
        const custoHoraNormal = salarioComEncargos / role.carga_horaria_mensal;
        
        // Overtime calculations
        const custoHoraHe50 = custoHoraNormal * (1 + parameters.he50_pct / 100);
        const custoHoraHe100 = custoHoraNormal * (1 + parameters.he100_pct / 100);

        // Memory object for audit
        const memoria = {
          salario_base: role.salario_base,
          encargos_pct: parameters.encargos_pct,
          salario_com_encargos: salarioComEncargos,
          carga_horaria: role.carga_horaria_mensal,
          he50_pct: parameters.he50_pct,
          he100_pct: parameters.he100_pct,
        };

        return {
          revision_id: revisionId,
          labor_role_id: role.id,
          custo_hora_normal: Math.round(custoHoraNormal * 100) / 100,
          custo_hora_he50: Math.round(custoHoraHe50 * 100) / 100,
          custo_hora_he100: Math.round(custoHoraHe100 * 100) / 100,
          memoria_json: memoria,
        };
      });

      // Upsert all snapshots
      for (const snapshot of results) {
        const { error } = await supabase
          .from('labor_cost_snapshot')
          .upsert(snapshot, { onConflict: 'revision_id,labor_role_id' });
        
        if (error) throw error;
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-cost-snapshot', revisionId] });
      queryClient.invalidateQueries({ queryKey: ['labor-hh-allocations', revisionId] });
      toast.success('Custos de MO recalculados com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao calcular custos: ${error.message}`);
    },
  });

  return {
    snapshots,
    isLoading,
    calculateCosts,
  };
}
