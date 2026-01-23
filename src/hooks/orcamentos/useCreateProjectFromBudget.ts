import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BudgetRevision, BudgetSummary } from '@/lib/orcamentos/types';

interface CreateProjectParams {
  budget: {
    id: string;
    cliente_id: string;
    obra_nome: string;
    local?: string;
  };
  revision: BudgetRevision;
  summary: BudgetSummary | null;
}

export function useCreateProjectFromBudget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProject = useMutation({
    mutationFn: async ({ budget, revision, summary }: CreateProjectParams) => {
      // 1. Validate revision is approved
      if (revision.status !== 'APPROVED') {
        throw new Error('Apenas revisões aprovadas podem gerar projetos');
      }

      // 2. Check if project already exists
      if (revision.projeto_id) {
        throw new Error('Esta revisão já possui um projeto vinculado');
      }

      // 3. Generate next OS number
      const { data: osData, error: osError } = await supabase.rpc('generate_next_os');
      if (osError) throw osError;

      // 4. Create project
      const { data: projeto, error: projetoError } = await supabase
        .from('projetos')
        .insert({
          empresa_id: budget.cliente_id,
          nome: budget.obra_nome,
          os: osData,
          status: 'planejado',
          aprovado: false,
          valor_contrato: summary?.preco_venda || 0,
          local: budget.local,
        })
        .select()
        .single();

      if (projetoError) throw projetoError;

      // 5. Link revision to project
      const { error: linkError } = await supabase
        .from('budget_revisions')
        .update({ projeto_id: projeto.id })
        .eq('id', revision.id);

      if (linkError) throw linkError;

      return projeto;
    },
    onSuccess: (projeto) => {
      queryClient.invalidateQueries({ queryKey: ['budget-revisions'] });
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      toast({
        title: 'Projeto criado com sucesso',
        description: `OS: ${projeto.os} - ${projeto.nome}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { createProject };
}
