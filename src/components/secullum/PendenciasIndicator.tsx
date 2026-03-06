import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface PendenciasIndicatorProps {
  count: number;
  onClick?: () => void;
}

/**
 * Indicador de dias com apontamento pendente de distribuição.
 */
export function PendenciasIndicator({ count, onClick }: PendenciasIndicatorProps) {
  if (count === 0) return null;

  return (
    <Badge
      variant="outline"
      className="cursor-pointer border-yellow-500 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50 gap-1"
      onClick={onClick}
    >
      <AlertCircle className="h-3 w-3" />
      {count} pendente{count !== 1 ? 's' : ''}
    </Badge>
  );
}
