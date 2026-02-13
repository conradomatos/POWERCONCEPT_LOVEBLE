import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function OmieSyncPanel() {
  const [syncType, setSyncType] = useState<'TODOS' | 'CONTAS_RECEBER' | 'CONTAS_PAGAR'>('TODOS');
  const [syncing, setSyncing] = useState(false);

  // Stats
  const { data: arCount } = useQuery({
    queryKey: ['omie-ar-count'],
    queryFn: async () => {
      const { count } = await supabase.from('omie_contas_receber').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: apCount } = useQuery({
    queryKey: ['omie-ap-count'],
    queryFn: async () => {
      const { count } = await supabase.from('omie_contas_pagar').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: unmappedCount } = useQuery({
    queryKey: ['omie-unmapped-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('omie_categoria_mapeamento')
        .select('*', { count: 'exact', head: true })
        .is('conta_dre_override', null)
        .is('categoria_contabil_id', null);
      return count ?? 0;
    },
  });

  // Sync history
  const { data: syncLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['omie-sync-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('omie_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await supabase.functions.invoke('omie-financeiro', {
        body: { tipo: syncType },
      });

      if (response.error) {
        toast.error(`Erro: ${response.error.message}`);
      } else if (response.data?.ok) {
        const d = response.data.data;
        toast.success(`Sincronização concluída: ${d.registros_processados} processados, ${d.registros_novos} novos`);
        refetchLogs();
      } else {
        toast.error(response.data?.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'SUCESSO': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'ERRO': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'PARCIAL': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Contas a Receber</p>
          <p className="text-2xl font-bold font-mono">{arCount ?? '—'}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Contas a Pagar</p>
          <p className="text-2xl font-bold font-mono">{apCount ?? '—'}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Categorias sem mapeamento</p>
          <p className="text-2xl font-bold font-mono text-amber-500">{unmappedCount ?? '—'}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Última Sync</p>
          <p className="text-sm font-mono">
            {syncLogs?.[0]
              ? new Date(syncLogs[0].iniciado_em).toLocaleString('pt-BR')
              : '—'
            }
          </p>
        </div>
      </div>

      {/* Sync controls */}
      <div className="flex items-center gap-3 border rounded-lg p-4">
        <Select value={syncType} onValueChange={(v: any) => setSyncType(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="CONTAS_RECEBER">Contas a Receber</SelectItem>
            <SelectItem value="CONTAS_PAGAR">Contas a Pagar</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Omie'}
        </Button>
      </div>

      {/* Sync history */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Histórico de Sincronizações</h3>
        {logsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Processados</TableHead>
                  <TableHead className="text-right">Novos</TableHead>
                  <TableHead className="text-right">Atualizados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!syncLogs || syncLogs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Nenhuma sincronização realizada
                    </TableCell>
                  </TableRow>
                )}
                {syncLogs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.iniciado_em).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusIcon(log.status)}
                        <span className="text-sm">{log.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{log.registros_processados ?? 0}</TableCell>
                    <TableCell className="text-right font-mono">{log.registros_novos ?? 0}</TableCell>
                    <TableCell className="text-right font-mono">{log.registros_atualizados ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
