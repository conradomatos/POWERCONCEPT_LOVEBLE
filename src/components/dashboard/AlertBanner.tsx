import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Users, FileWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Alerta {
  tipo: 'prazo_critico' | 'margem_negativa' | 'apontamentos_pendentes' | 'titulos_vencidos' | 'sem_custo' | 'pendente_aprovacao' | 'estouro_horas';
  quantidade: number;
  prioridade: 'vermelho' | 'amarelo';
  label: string;
  link: string;
}

interface AlertBannerProps {
  alertas: Alerta[];
  isLoading?: boolean;
}

const alertaIcons = {
  prazo_critico: Clock,
  margem_negativa: DollarSign,
  apontamentos_pendentes: FileWarning,
  titulos_vencidos: DollarSign,
  sem_custo: Users,
  pendente_aprovacao: AlertTriangle,
  estouro_horas: Clock,
};

export function AlertBanner({ alertas, isLoading }: AlertBannerProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-48" />
      </div>
    );
  }

  if (!alertas || alertas.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-500" />
        <span className="text-emerald-500 font-medium">✓ Nenhum alerta crítico</span>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span className="font-medium text-foreground">Alertas Críticos</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {alertas.map((alerta, index) => {
          const Icon = alertaIcons[alerta.tipo];
          return (
            <Badge
              key={index}
              variant="outline"
              className={cn(
                "cursor-pointer transition-colors flex items-center gap-2 px-3 py-1.5",
                alerta.prioridade === 'vermelho'
                  ? "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
              )}
              onClick={() => navigate(alerta.link)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{alerta.label}</span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
