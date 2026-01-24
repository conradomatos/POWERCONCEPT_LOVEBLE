import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Building2, MapPin, Building } from 'lucide-react';

type PriceOrigin = 'EMPRESA_REGIAO' | 'EMPRESA' | 'REGIAO' | 'GLOBAL' | null;

interface PriceOriginBadgeProps {
  origem: PriceOrigin;
  pricebookNome?: string;
  className?: string;
}

const ORIGIN_CONFIG: Record<NonNullable<PriceOrigin>, { 
  label: string; 
  icon: React.ElementType; 
  variant: 'default' | 'secondary' | 'outline';
  className: string;
}> = {
  EMPRESA_REGIAO: { 
    label: 'E+R', 
    icon: Building,
    variant: 'default',
    className: 'bg-primary/80 text-primary-foreground',
  },
  EMPRESA: { 
    label: 'Empresa', 
    icon: Building2,
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800',
  },
  REGIAO: { 
    label: 'Região', 
    icon: MapPin,
    variant: 'secondary',
    className: 'bg-purple-100 text-purple-800',
  },
  GLOBAL: { 
    label: 'Global', 
    icon: Globe,
    variant: 'outline',
    className: 'border-muted-foreground/30 text-muted-foreground',
  },
};

export function PriceOriginBadge({ origem, pricebookNome, className }: PriceOriginBadgeProps) {
  if (!origem) {
    return (
      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 border-dashed ${className}`}>
        Sem preço
      </Badge>
    );
  }

  const config = ORIGIN_CONFIG[origem];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={config.variant} className={`text-[10px] h-5 px-1.5 gap-0.5 ${config.className} ${className}`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      {pricebookNome && (
        <TooltipContent>
          <p className="text-xs">{pricebookNome}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
