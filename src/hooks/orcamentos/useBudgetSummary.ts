import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BudgetSummary } from '@/lib/orcamentos/types';

export interface SummaryCalculationResult {
  total_materiais: number;
  total_hh_materiais: number;
  total_mo: number;
  total_mobilizacao: number;
  total_canteiro: number;
  total_equipamentos: number;
  total_engenharia: number;
  subtotal_custo: number;
  markup_pct_aplicado: number;
  valor_markup: number;
  total_impostos: number;
  preco_venda: number;
  margem_rs: number;
  margem_pct: number;
}

export function useBudgetSummary(revisionId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ['budget-summary', revisionId],
    queryFn: async () => {
      if (!revisionId) return null;
      const { data, error } = await supabase
        .from('budget_summary')
        .select('*')
        .eq('revision_id', revisionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as BudgetSummary | null;
    },
    enabled: !!revisionId,
  });

  const recalculate = useMutation({
    mutationFn: async () => {
      if (!revisionId) throw new Error('Revision ID required');

      // 1. Fetch all cost data
      const [
        materialsRes,
        laborAllocRes,
        mobilizationRes,
        siteMaintenanceRes,
        equipmentRes,
        engineeringRes,
        markupRes,
        taxRulesRes,
      ] = await Promise.all([
        supabase.from('budget_material_items').select('preco_total, hh_total').eq('revision_id', revisionId),
        supabase.from('labor_hh_allocations').select('custo_total').eq('revision_id', revisionId),
        supabase.from('mobilization_items').select('total').eq('revision_id', revisionId),
        supabase.from('site_maintenance_items').select('total').eq('revision_id', revisionId),
        supabase.from('equipment_rentals').select('total').eq('revision_id', revisionId),
        supabase.from('engineering_items').select('total').eq('revision_id', revisionId),
        supabase.from('markup_rules').select('markup_pct').eq('revision_id', revisionId).single(),
        supabase.from('tax_rules').select('*').eq('revision_id', revisionId),
      ]);

      // 2. Calculate totals
      const total_materiais = (materialsRes.data || []).reduce((sum, i) => sum + (Number(i.preco_total) || 0), 0);
      const total_hh_materiais = (materialsRes.data || []).reduce((sum, i) => sum + (Number(i.hh_total) || 0), 0);
      const total_mo = (laborAllocRes.data || []).reduce((sum, i) => sum + (Number(i.custo_total) || 0), 0);
      const total_mobilizacao = (mobilizationRes.data || []).reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      const total_canteiro = (siteMaintenanceRes.data || []).reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      const total_equipamentos = (equipmentRes.data || []).reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      const total_engenharia = (engineeringRes.data || []).reduce((sum, i) => sum + (Number(i.total) || 0), 0);

      const subtotal_custo = total_materiais + total_mo + total_mobilizacao + total_canteiro + total_equipamentos + total_engenharia;

      // 3. Apply markup
      const markup_pct = markupRes.data?.markup_pct || 0;
      const valor_markup = subtotal_custo * (markup_pct / 100);
      const venda_bruta = subtotal_custo + valor_markup;

      // 4. Calculate taxes
      let total_impostos = 0;
      const taxRules = taxRulesRes.data || [];
      
      for (const rule of taxRules) {
        if (!rule.ativo) continue;
        
        const base = rule.base === 'SALE' ? venda_bruta : subtotal_custo;
        let taxableAmount = base;

        // Apply scope filters (aplica_em in DB)
        if (rule.aplica_em === 'MATERIALS') {
          taxableAmount = total_materiais;
        } else if (rule.aplica_em === 'SERVICES') {
          taxableAmount = total_mo + total_engenharia;
        }

        if (rule.tipo === 'PERCENT') {
          total_impostos += taxableAmount * (Number(rule.valor) / 100);
        } else {
          total_impostos += Number(rule.valor);
        }
      }

      // 5. Final calculations
      const preco_venda = venda_bruta + total_impostos;
      const margem_rs = preco_venda - subtotal_custo - total_impostos;
      const margem_pct = preco_venda > 0 ? (margem_rs / preco_venda) * 100 : 0;

      // 6. Upsert summary
      const summaryData = {
        revision_id: revisionId,
        total_materiais,
        total_hh_materiais,
        total_mo,
        total_mobilizacao,
        total_canteiro,
        total_equipamentos,
        total_engenharia,
        subtotal_custo,
        markup_pct_aplicado: markup_pct,
        valor_markup,
        total_impostos,
        preco_venda,
        margem_rs,
        margem_pct,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('budget_summary')
        .upsert(summaryData, { onConflict: 'revision_id' });

      if (error) throw error;
      return summaryData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-summary', revisionId] });
      toast({ title: 'Resumo recalculado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao recalcular resumo', description: error.message, variant: 'destructive' });
    },
  });

  return {
    summary: summaryQuery.data,
    isLoading: summaryQuery.isLoading,
    recalculate,
  };
}
