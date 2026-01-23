import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Budget, BudgetFormData, BudgetWithRelations } from '@/lib/orcamentos/types';

export function useBudgets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all budgets with relations
  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          cliente:empresas!budgets_cliente_id_fkey(id, empresa, codigo),
          revisions:budget_revisions(id, revision_number, status, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process to add latest revision
      return (data || []).map((budget: any) => {
        const revisions = budget.revisions || [];
        const latestRevision = revisions.reduce((latest: any, rev: any) => {
          if (!latest || rev.revision_number > latest.revision_number) return rev;
          return latest;
        }, null);

        return {
          ...budget,
          latest_revision: latestRevision,
        };
      }) as BudgetWithRelations[];
    },
    enabled: !!user,
  });

  // Generate next budget number
  const generateBudgetNumber = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_next_budget_number');
    if (error) throw error;
    return data as string;
  };

  // Create budget
  const createBudget = useMutation({
    mutationFn: async (formData: BudgetFormData) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Generate budget number if not provided
      const budgetNumber = formData.budget_number || await generateBudgetNumber();

      // Create budget
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          budget_number: budgetNumber,
          cliente_id: formData.cliente_id,
          obra_nome: formData.obra_nome,
          local: formData.local,
          responsavel_user_id: user.id,
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Create initial revision (rev 0)
      const { error: revisionError } = await supabase
        .from('budget_revisions')
        .insert({
          budget_id: budget.id,
          revision_number: 0,
          status: 'DRAFT',
          created_by: user.id,
        });

      if (revisionError) throw revisionError;

      // Create empty summary for the revision
      const { data: revision } = await supabase
        .from('budget_revisions')
        .select('id')
        .eq('budget_id', budget.id)
        .eq('revision_number', 0)
        .single();

      if (revision) {
        await supabase
          .from('budget_summary')
          .insert({ revision_id: revision.id });
      }

      return budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento criado com sucesso');
    },
    onError: (error: any) => {
      console.error('Error creating budget:', error);
      toast.error(error.message || 'Erro ao criar orçamento');
    },
  });

  // Update budget
  const updateBudget = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Budget> & { id: string }) => {
      const { error } = await supabase
        .from('budgets')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar orçamento');
    },
  });

  // Delete budget
  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir orçamento');
    },
  });

  // Duplicate budget
  const duplicateBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch original budget
      const { data: original, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new budget number
      const newNumber = await generateBudgetNumber();

      // Create new budget
      const { data: newBudget, error: createError } = await supabase
        .from('budgets')
        .insert({
          budget_number: newNumber,
          cliente_id: original.cliente_id,
          obra_nome: `${original.obra_nome} (Cópia)`,
          local: original.local,
          responsavel_user_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create initial revision
      const { data: newRevision, error: revisionError } = await supabase
        .from('budget_revisions')
        .insert({
          budget_id: newBudget.id,
          revision_number: 0,
          status: 'DRAFT',
          created_by: user.id,
        })
        .select()
        .single();

      if (revisionError) throw revisionError;

      // Create empty summary
      await supabase
        .from('budget_summary')
        .insert({ revision_id: newRevision.id });

      return newBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento duplicado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao duplicar orçamento');
    },
  });

  return {
    budgets: budgetsQuery.data || [],
    isLoading: budgetsQuery.isLoading,
    error: budgetsQuery.error,
    createBudget,
    updateBudget,
    deleteBudget,
    duplicateBudget,
    generateBudgetNumber,
  };
}
