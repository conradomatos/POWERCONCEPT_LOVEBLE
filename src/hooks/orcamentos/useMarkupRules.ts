import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarkupRules {
  id: string;
  revision_id: string;
  markup_pct: number;
  allow_per_wbs: boolean;
  created_at: string;
}

export interface MarkupFormData {
  markup_pct: number;
  allow_per_wbs?: boolean;
}

export function useMarkupRules(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: markup, isLoading } = useQuery({
    queryKey: ['markup-rules', revisionId],
    queryFn: async () => {
      if (!revisionId) return null;
      const { data, error } = await supabase
        .from('markup_rules')
        .select('*')
        .eq('revision_id', revisionId)
        .maybeSingle();

      if (error) throw error;
      return data as MarkupRules | null;
    },
    enabled: !!revisionId,
  });

  const upsertMarkup = useMutation({
    mutationFn: async (formData: MarkupFormData) => {
      if (!revisionId) throw new Error('Revisão não selecionada');

      const { data, error } = await supabase
        .from('markup_rules')
        .upsert({
          revision_id: revisionId,
          ...formData,
        }, { onConflict: 'revision_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markup-rules', revisionId] });
      toast.success('Markup salvo com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar markup: ${error.message}`);
    },
  });

  return {
    markup,
    isLoading,
    upsertMarkup,
  };
}
