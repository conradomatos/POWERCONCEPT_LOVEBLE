import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface EquipmentCatalogRequest {
  id: string;
  codigo: string | null;
  descricao: string;
  unidade: string;
  preco_mensal_ref: number | null;
  observacao: string | null;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_catalog_id: string | null;
  created_at: string;
}

export interface CreateRequestData {
  codigo?: string;
  descricao: string;
  unidade?: string;
  preco_mensal_ref?: number;
  observacao?: string;
}

export function useEquipmentCatalogRequests() {
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();
  
  const isCatalogManager = roles.includes('super_admin') || roles.includes('catalog_manager');

  // Fetch requests (user sees own, manager sees all)
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['equipment-catalog-requests', user?.id, isCatalogManager],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_catalog_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as EquipmentCatalogRequest[];
    },
    enabled: !!user,
  });

  // Pending requests count for managers
  const pendingCount = requests.filter(r => r.status === 'PENDENTE').length;

  // Create a new request
  const createRequest = useMutation({
    mutationFn: async (data: CreateRequestData) => {
      const { data: result, error } = await supabase
        .from('equipment_catalog_requests')
        .insert({
          codigo: data.codigo || null,
          descricao: data.descricao,
          unidade: data.unidade || 'mês',
          preco_mensal_ref: data.preco_mensal_ref || null,
          observacao: data.observacao || null,
          requested_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-requests'] });
      toast.success('Solicitação enviada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar solicitação: ${error.message}`);
    },
  });

  // Approve request (creates catalog item)
  const approveRequest = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      // Get the request
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Solicitação não encontrada');

      // Create catalog item
      const { data: catalogItem, error: createError } = await supabase
        .from('equipment_catalog')
        .insert({
          codigo: request.codigo || `EQ-${Date.now()}`,
          descricao: request.descricao,
          unidade: request.unidade,
          preco_mensal_ref: request.preco_mensal_ref || 0,
          ativo: true,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update request status
      const { error: updateError } = await supabase
        .from('equipment_catalog_requests')
        .update({
          status: 'APROVADO',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
          created_catalog_id: catalogItem.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return catalogItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-requests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
      toast.success('Solicitação aprovada! Equipamento adicionado ao catálogo.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

  // Reject request
  const rejectRequest = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      const { error } = await supabase
        .from('equipment_catalog_requests')
        .update({
          status: 'REJEITADO',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-requests'] });
      toast.success('Solicitação rejeitada.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    },
  });

  return {
    requests,
    isLoading,
    pendingCount,
    isCatalogManager,
    createRequest,
    approveRequest,
    rejectRequest,
  };
}
