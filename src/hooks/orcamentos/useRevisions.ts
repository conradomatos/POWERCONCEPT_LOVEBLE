import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { BudgetRevision, RevisionFormData, RevisionStatus } from '@/lib/orcamentos/types';

export function useRevisions(budgetId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch revisions for a budget
  const revisionsQuery = useQuery({
    queryKey: ['budget-revisions', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];

      const { data, error } = await supabase
        .from('budget_revisions')
        .select('*')
        .eq('budget_id', budgetId)
        .order('revision_number', { ascending: false });

      if (error) throw error;
      return data as BudgetRevision[];
    },
    enabled: !!budgetId,
  });

  // Create new revision (clone from latest)
  const createRevision = useMutation({
    mutationFn: async (sourceRevisionId?: string) => {
      if (!user || !budgetId) throw new Error('Dados insuficientes');

      // Get latest revision number
      const { data: latest } = await supabase
        .from('budget_revisions')
        .select('revision_number')
        .eq('budget_id', budgetId)
        .order('revision_number', { ascending: false })
        .limit(1)
        .single();

      const newRevisionNumber = (latest?.revision_number ?? -1) + 1;

      // Create new revision
      const { data: newRevision, error: revisionError } = await supabase
        .from('budget_revisions')
        .insert({
          budget_id: budgetId,
          revision_number: newRevisionNumber,
          status: 'DRAFT' as RevisionStatus,
          created_by: user.id,
        })
        .select()
        .single();

      if (revisionError) throw revisionError;

      // Create empty summary
      await supabase
        .from('budget_summary')
        .insert({ revision_id: newRevision.id });

      // If source revision provided, clone WBS and materials
      if (sourceRevisionId) {
        // Clone WBS
        const { data: wbsItems } = await supabase
          .from('budget_wbs')
          .select('*')
          .eq('revision_id', sourceRevisionId)
          .is('parent_id', null)
          .order('ordem');

        if (wbsItems && wbsItems.length > 0) {
          // Clone parent WBS items first
          for (const wbs of wbsItems) {
            const { data: newWbs } = await supabase
              .from('budget_wbs')
              .insert({
                revision_id: newRevision.id,
                code: wbs.code,
                nome: wbs.nome,
                ordem: wbs.ordem,
                tipo: wbs.tipo,
              })
              .select()
              .single();

            // Clone child WBS items
            if (newWbs) {
              const { data: childWbs } = await supabase
                .from('budget_wbs')
                .select('*')
                .eq('revision_id', sourceRevisionId)
                .eq('parent_id', wbs.id)
                .order('ordem');

              if (childWbs) {
                for (const child of childWbs) {
                  await supabase
                    .from('budget_wbs')
                    .insert({
                      revision_id: newRevision.id,
                      code: child.code,
                      nome: child.nome,
                      parent_id: newWbs.id,
                      ordem: child.ordem,
                      tipo: child.tipo,
                    });
                }
              }
            }
          }
        }

        // Clone materials
        const { data: materials } = await supabase
          .from('budget_material_items')
          .select('*')
          .eq('revision_id', sourceRevisionId)
          .order('item_seq');

        if (materials && materials.length > 0) {
          const materialsToInsert = materials.map((m) => ({
            revision_id: newRevision.id,
            item_seq: m.item_seq,
            codigo: m.codigo,
            descricao: m.descricao,
            unidade: m.unidade,
            quantidade: m.quantidade,
            fornecimento: m.fornecimento,
            hh_unitario: m.hh_unitario,
            fator_dificuldade: m.fator_dificuldade,
            preco_unit: m.preco_unit,
            observacao: m.observacao,
            // wbs_id will need to be mapped if WBS was cloned
          }));

          await supabase
            .from('budget_material_items')
            .insert(materialsToInsert);
        }
      }

      return newRevision;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions', budgetId] });
      toast.success('Nova revisão criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar revisão');
    },
  });

  // Update revision details
  const updateRevision = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BudgetRevision> & { id: string }) => {
      const { error } = await supabase
        .from('budget_revisions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions', budgetId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar revisão');
    },
  });

  // Send revision for approval
  const sendRevision = useMutation({
    mutationFn: async (revisionId: string) => {
      const { error } = await supabase
        .from('budget_revisions')
        .update({
          status: 'SENT' as RevisionStatus,
          sent_at: new Date().toISOString(),
        })
        .eq('id', revisionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions', budgetId] });
      toast.success('Revisão enviada para aprovação');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar revisão');
    },
  });

  // Approve revision
  const approveRevision = useMutation({
    mutationFn: async (revisionId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('budget_revisions')
        .update({
          status: 'APPROVED' as RevisionStatus,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', revisionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions', budgetId] });
      toast.success('Revisão aprovada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aprovar revisão');
    },
  });

  // Reject revision
  const rejectRevision = useMutation({
    mutationFn: async (revisionId: string) => {
      const { error } = await supabase
        .from('budget_revisions')
        .update({
          status: 'REJECTED' as RevisionStatus,
        })
        .eq('id', revisionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions', budgetId] });
      toast.success('Revisão reprovada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao reprovar revisão');
    },
  });

  // Cancel revision
  const cancelRevision = useMutation({
    mutationFn: async (revisionId: string) => {
      const { error } = await supabase
        .from('budget_revisions')
        .update({
          status: 'CANCELED' as RevisionStatus,
        })
        .eq('id', revisionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions', budgetId] });
      toast.success('Revisão cancelada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar revisão');
    },
  });

  return {
    revisions: revisionsQuery.data || [],
    isLoading: revisionsQuery.isLoading,
    error: revisionsQuery.error,
    createRevision,
    updateRevision,
    sendRevision,
    approveRevision,
    rejectRevision,
    cancelRevision,
  };
}
