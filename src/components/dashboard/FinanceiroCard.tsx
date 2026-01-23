import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface FinanceiroCardProps {
  valores: {
    faturado: number;
    aReceber: number;
    custoMO: number;
    margemPct: number | null;
  };
  aging: {
    aVencer: number;
    ate30: number;
    ate60: number;
    mais60: number;
  };
  isLoading?: boolean;
}

function getMargemColor(margem: number | null): string {
  if (margem === null) return 'text-muted-foreground';
  if (margem >= 20) return 'text-emerald-600 dark:text-emerald-400';
  if (margem >= 0) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

function formatCompactValue(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

const agingLabels = [
  { key: 'aVencer', label: 'A vencer', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'ate30', label: '1-30 dias', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'ate60', label: '31-60 dias', color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' },
  { key: 'mais60', label: '> 60 dias', color: 'bg-destructive', textColor: 'text-destructive' },
] as const;

export function FinanceiroCard({ valores, aging, isLoading }: FinanceiroCardProps) {
  const navigate = useNavigate();
  const totalAging = aging.aVencer + aging.ate30 + aging.ate60 + aging.mais60;

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate" title={formatCurrency(valores.faturado)}>
              {formatCompactValue(valores.faturado)}
            </div>
            <div className="text-xs text-muted-foreground">Faturado</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 truncate" title={formatCurrency(valores.aReceber)}>
              {formatCompactValue(valores.aReceber)}
            </div>
            <div className="text-xs text-muted-foreground">A Receber</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold truncate" title={formatCurrency(valores.custoMO)}>
              {formatCompactValue(valores.custoMO)}
            </div>
            <div className="text-xs text-muted-foreground">Custo MO</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className={cn("text-lg font-bold", getMargemColor(valores.margemPct))}>
              {valores.margemPct !== null ? `${valores.margemPct.toFixed(1)}%` : '-'}
            </div>
            <div className="text-xs text-muted-foreground">Margem</div>
          </div>
        </div>

        {/* Aging de Títulos */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Aging de Títulos a Receber</h4>
          {totalAging > 0 ? (
            <div className="space-y-2">
              {agingLabels.map(({ key, label, color, textColor }) => {
                const value = aging[key];
                const percentage = totalAging > 0 ? (value / totalAging) * 100 : 0;
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cn("font-medium", textColor)}>
                        {formatCompactValue(value)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn("h-full transition-all", color)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              ✓ Nenhum título pendente
            </div>
          )}
        </div>

        {/* Botão */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/rentabilidade')}
        >
          Ver financeiro
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
