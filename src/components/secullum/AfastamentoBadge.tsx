import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AFASTAMENTO_COLORS } from '@/services/secullum/constants';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AfastamentoBadgeProps {
  tipo: string;
  dataInicio?: string;
  dataFim?: string;
}

const LABELS: Record<string, string> = {
  FERIAS: 'Férias',
  ATESTADO: 'Atestado',
  LICENCA: 'Licença',
  OUTRO: 'Afastamento',
};

/**
 * Badge colorido por tipo de afastamento com tooltip mostrando período.
 */
export function AfastamentoBadge({ tipo, dataInicio, dataFim }: AfastamentoBadgeProps) {
  const colors = AFASTAMENTO_COLORS[tipo] || AFASTAMENTO_COLORS.OUTRO;
  const label = LABELS[tipo] || tipo;

  const badge = (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium border', colors.bg, colors.text, colors.border)}
    >
      {label}
    </Badge>
  );

  if (!dataInicio || !dataFim) return badge;

  const inicio = format(parseISO(dataInicio), 'dd/MM', { locale: ptBR });
  const fim = format(parseISO(dataFim), 'dd/MM', { locale: ptBR });

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        {label}: {inicio} a {fim}
      </TooltipContent>
    </Tooltip>
  );
}
