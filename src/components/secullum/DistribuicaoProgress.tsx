import { cn } from '@/lib/utils';

interface DistribuicaoProgressProps {
  horasBase: number;
  horasApontadas: number;
  tolerancia?: number;
}

/**
 * Barra de progresso mostrando distribuição de horas.
 * "Xh de Yh distribuídas (ZZ%)"
 */
export function DistribuicaoProgress({
  horasBase,
  horasApontadas,
  tolerancia = 0.25,
}: DistribuicaoProgressProps) {
  if (horasBase <= 0) return null;

  const percentual = Math.min((horasApontadas / horasBase) * 100, 100);
  const saldo = horasBase - horasApontadas;
  const isCompleto = Math.abs(saldo) <= tolerancia;
  const isExcedido = horasApontadas > horasBase + tolerancia;

  const barColor = isExcedido
    ? 'bg-red-500'
    : isCompleto
      ? 'bg-green-500'
      : 'bg-yellow-500';

  const textColor = isExcedido
    ? 'text-red-600 dark:text-red-400'
    : isCompleto
      ? 'text-green-600 dark:text-green-400'
      : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn('font-medium', textColor)}>
          {horasApontadas.toFixed(2)}h de {horasBase.toFixed(2)}h distribuídas
        </span>
        <span className={cn('font-medium', textColor)}>
          {percentual.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>
      {!isCompleto && saldo > tolerancia && (
        <p className="text-xs text-muted-foreground">
          Faltam {saldo.toFixed(2)}h para completar
        </p>
      )}
    </div>
  );
}
