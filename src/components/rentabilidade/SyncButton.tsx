import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncButtonProps {
  lastSyncAt?: string | null;
  onSyncComplete?: () => void;
  className?: string;
}

export function SyncButton({ lastSyncAt, onSyncComplete, className }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<'success' | 'error' | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('omie-financeiro', {
        body: { tipo: 'TODOS' },
      });

      if (error) throw error;

      if (data?.ok) {
        setSyncResult('success');
        toast.success('Sincronização concluída', {
          description: `${data.data.registros_processados} registros processados, ${data.data.pendencias_criadas} pendências criadas`,
        });
        onSyncComplete?.();
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      setSyncResult('error');
      toast.error('Erro na sincronização', {
        description: error instanceof Error ? error.message : 'Erro ao sincronizar com Omie',
      });
    } finally {
      setIsSyncing(false);
      // Reset result icon after 3 seconds
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  const formatLastSync = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true, locale: ptBR }),
        absolute: format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      };
    } catch {
      return null;
    }
  };

  const lastSyncFormatted = lastSyncAt ? formatLastSync(lastSyncAt) : null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {lastSyncFormatted && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground hidden sm:inline cursor-help">
              Sync: {lastSyncFormatted.relative}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Última sincronização: {lastSyncFormatted.absolute}</p>
          </TooltipContent>
        </Tooltip>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="gap-2"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline">Sincronizando...</span>
          </>
        ) : syncResult === 'success' ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span className="hidden sm:inline">Sincronizado</span>
          </>
        ) : syncResult === 'error' ? (
          <>
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="hidden sm:inline">Erro</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sincronizar Omie</span>
          </>
        )}
      </Button>
    </div>
  );
}
