import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { syncSecullum } from '@/services/secullum/sync';
import type { SecullumSyncParams, SecullumSyncLog } from '@/services/secullum/types';

/**
 * Hook para sincronização com Secullum Ponto Web.
 * Gerencia estado de sync, invoca Edge Function, invalida queries relevantes.
 */
export function useSecullumSync() {
  const queryClient = useQueryClient();

  /** Dispara sincronização */
  const syncMutation = useMutation({
    mutationFn: async (params: SecullumSyncParams) => {
      const result = await syncSecullum(params);
      if (!result.ok) {
        throw new Error(result.error || 'Erro na sincronização');
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['secullum-calculos'] });
      queryClient.invalidateQueries({ queryKey: ['secullum-afastamentos'] });
      queryClient.invalidateQueries({ queryKey: ['apontamento-dia'] });
      queryClient.invalidateQueries({ queryKey: ['apontamentos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['secullum-sync-log'] });

      const d = result.data;
      const parts: string[] = [];
      if (d?.funcionarios) parts.push(`${d.funcionarios.sincronizados} funcionários`);
      if (d?.calculos) parts.push(`${d.calculos.sincronizados} cálculos`);
      if (d?.afastamentos) parts.push(`${d.afastamentos.sincronizados} afastamentos`);
      if (d?.fotos) parts.push(`${d.fotos.sincronizadas} fotos`);

      toast.success(
        parts.length > 0
          ? `Sincronização concluída: ${parts.join(', ')}`
          : result.message || 'Sincronização concluída',
      );
    },
    onError: (error: Error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  /** Último log de sync */
  const { data: syncLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['secullum-sync-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secullum_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SecullumSyncLog[];
    },
  });

  const lastSync = syncLogs.length > 0 ? syncLogs[0] : null;

  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
    syncError: syncMutation.error,
    syncLogs,
    lastSync,
    isLoadingLogs,
  };
}
