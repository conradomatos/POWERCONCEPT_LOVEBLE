import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface BudgetDocument {
  id: string;
  revision_id: string;
  tipo: string;
  nome_arquivo: string;
  storage_path: string;
  created_at: string;
  created_by: string;
}

export function useDocuments(revisionId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const documentsQuery = useQuery({
    queryKey: ['budget-documents', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('budget_documents')
        .select('*')
        .eq('revision_id', revisionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BudgetDocument[];
    },
    enabled: !!revisionId,
  });

  const createDocument = useMutation({
    mutationFn: async (data: { tipo: string; nome_arquivo: string; storage_path: string }) => {
      if (!revisionId || !user) throw new Error('Missing required data');

      const { data: newDoc, error } = await supabase
        .from('budget_documents')
        .insert({
          revision_id: revisionId,
          tipo: data.tipo,
          nome_arquivo: data.nome_arquivo,
          storage_path: data.storage_path,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return newDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-documents', revisionId] });
      toast({ title: 'Documento registrado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao registrar documento', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-documents', revisionId] });
      toast({ title: 'Documento removido com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover documento', description: error.message, variant: 'destructive' });
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    createDocument,
    deleteDocument,
  };
}
