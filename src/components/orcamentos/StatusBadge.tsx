import { Badge } from '@/components/ui/badge';
import { REVISION_STATUS_CONFIG, type RevisionStatus } from '@/lib/orcamentos/types';
import { FileEdit, Send, CheckCircle, XCircle, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: RevisionStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const iconMap = {
  FileEdit,
  Send,
  CheckCircle,
  XCircle,
  Ban,
};

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const config = REVISION_STATUS_CONFIG[status];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  return (
    <Badge 
      className={`${config.color} ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}
      variant="outline"
    >
      {showIcon && IconComponent && (
        <IconComponent className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
      )}
      {config.label}
    </Badge>
  );
}
