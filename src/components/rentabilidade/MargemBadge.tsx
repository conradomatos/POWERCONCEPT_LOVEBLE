import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusMargem = 'SAUDAVEL' | 'ATENCAO' | 'BAIXA' | 'NEGATIVA' | 'SEM_DADOS';

interface MargemBadgeProps {
  valor: number;
  status?: StatusMargem;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<StatusMargem, { label: string; className: string }> = {
  SAUDAVEL: {
    label: 'Saudável',
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  },
  ATENCAO: {
    label: 'Atenção',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
  },
  BAIXA: {
    label: 'Baixa',
    className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
  },
  NEGATIVA: {
    label: 'Negativa',
    className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
  },
  SEM_DADOS: {
    label: 'Sem dados',
    className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
  },
};

function getStatusFromValor(valor: number): StatusMargem {
  if (valor >= 20) return 'SAUDAVEL';
  if (valor >= 10) return 'ATENCAO';
  if (valor >= 0) return 'BAIXA';
  return 'NEGATIVA';
}

export function MargemBadge({
  valor,
  status,
  showValue = true,
  size = 'md',
  className,
}: MargemBadgeProps) {
  const finalStatus = status || getStatusFromValor(valor);
  const config = statusConfig[finalStatus];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={cn(config.className, sizeClasses[size], className)}
    >
      {showValue ? `${valor.toFixed(1)}%` : config.label}
    </Badge>
  );
}

export function MargemIndicator({ valor, className }: { valor: number; className?: string }) {
  const status = getStatusFromValor(valor);
  
  const colorClasses = {
    SAUDAVEL: 'bg-green-500',
    ATENCAO: 'bg-yellow-500',
    BAIXA: 'bg-orange-500',
    NEGATIVA: 'bg-red-500',
    SEM_DADOS: 'bg-gray-400',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full', colorClasses[status])} />
      <span className={cn(
        'font-medium',
        status === 'SAUDAVEL' && 'text-green-700',
        status === 'ATENCAO' && 'text-yellow-700',
        status === 'BAIXA' && 'text-orange-700',
        status === 'NEGATIVA' && 'text-red-700',
        status === 'SEM_DADOS' && 'text-gray-500',
      )}>
        {valor.toFixed(1)}%
      </span>
    </span>
  );
}
