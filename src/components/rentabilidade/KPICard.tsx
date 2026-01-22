import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  onClick?: () => void;
  className?: string;
  tooltip?: string;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-green-500/30 bg-green-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  danger: 'border-red-500/30 bg-red-500/5',
  info: 'border-blue-500/30 bg-blue-500/5',
};

const iconVariantStyles = {
  default: 'text-muted-foreground bg-muted',
  success: 'text-green-600 bg-green-100',
  warning: 'text-yellow-600 bg-yellow-100',
  danger: 'text-red-600 bg-red-100',
  info: 'text-blue-600 bg-blue-100',
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
  badge,
  badgeVariant = 'secondary',
  onClick,
  className,
  tooltip,
}: KPICardProps) {
  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === undefined ? '' : trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground';

  const content = (
    <Card
      className={cn(
        'transition-all duration-200',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/50',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                {title}
              </p>
              {badge && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                  badgeVariant === 'secondary' && 'bg-muted text-muted-foreground',
                  badgeVariant === 'outline' && 'border border-current',
                  badgeVariant === 'default' && 'bg-primary text-primary-foreground',
                )}>
                  {badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mt-1 truncate">
              {value}
            </p>
            {(subtitle || trend !== undefined) && (
              <div className="flex items-center gap-2 mt-1">
                {trend !== undefined && TrendIcon && (
                  <span className={cn('flex items-center text-xs font-medium', trendColor)}>
                    <TrendIcon className="h-3 w-3 mr-0.5" />
                    {Math.abs(trend).toFixed(1)}%
                    {trendLabel && <span className="text-muted-foreground ml-1">{trendLabel}</span>}
                  </span>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'p-2 rounded-lg shrink-0',
              iconVariantStyles[variant]
            )}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
