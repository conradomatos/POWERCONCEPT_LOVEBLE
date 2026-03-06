import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSecullumCalculos } from '@/hooks/useSecullumCalculos';
import { TIPO_DIA_LABELS } from '@/services/secullum/constants';
import { Clock, AlertTriangle } from 'lucide-react';

interface SecullumResumoProps {
  colaboradorId: string;
  data: string;
}

/**
 * Card com resumo dos cálculos Secullum do dia.
 * Exibe horas normais, extras, noturnas, faltas e total.
 */
export function SecullumResumo({ colaboradorId, data }: SecullumResumoProps) {
  const { calculo, isLoading } = useSecullumCalculos(colaboradorId, data);

  if (isLoading) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardContent className="py-3 px-4">
          <div className="animate-pulse h-4 w-48 bg-yellow-200/50 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!calculo) return null;

  const tipoDiaLabel = TIPO_DIA_LABELS[calculo.tipo_dia] || calculo.tipo_dia;
  const total = calculo.total_horas_trabalhadas ?? 0;

  return (
    <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
          <Clock className="h-4 w-4" />
          Ponto Secullum — {tipoDiaLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <HoraItem label="Normais" horas={calculo.horas_normais} />
          {calculo.horas_extra_50 > 0 && (
            <HoraItem label="Extra 50%" horas={calculo.horas_extra_50} className="text-amber-600 dark:text-amber-400" />
          )}
          {calculo.horas_extra_100 > 0 && (
            <HoraItem label="Extra 100%" horas={calculo.horas_extra_100} className="text-orange-600 dark:text-orange-400" />
          )}
          {calculo.horas_noturnas > 0 && (
            <HoraItem label="Noturnas" horas={calculo.horas_noturnas} className="text-indigo-600 dark:text-indigo-400" />
          )}
          {calculo.horas_faltas > 0 && (
            <HoraItem label="Faltas" horas={calculo.horas_faltas} className="text-red-600 dark:text-red-400" icon={<AlertTriangle className="h-3 w-3" />} />
          )}
          <div className="ml-auto font-semibold text-yellow-800 dark:text-yellow-300">
            Total: {formatHoras(total)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HoraItem({
  label,
  horas,
  className,
  icon,
}: {
  label: string;
  horas: number;
  className?: string;
  icon?: React.ReactNode;
}) {
  if (horas === 0) return null;
  return (
    <div className={className}>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium inline-flex items-center gap-1">
        {icon}
        {formatHoras(horas)}
      </span>
    </div>
  );
}

function formatHoras(h: number): string {
  return `${h.toFixed(2)}h`;
}
