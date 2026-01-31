import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialKPIsProps {
  receita: number;
  custo: number;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function getMargemColor(margem: number): string {
  if (margem >= 15) return 'text-emerald-600 dark:text-emerald-400';
  if (margem >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

function getMargemBgColor(margem: number): string {
  if (margem >= 15) return 'bg-emerald-500/10';
  if (margem >= 5) return 'bg-amber-500/10';
  return 'bg-destructive/10';
}

export function FinancialKPIs({ receita, custo, isLoading }: FinancialKPIsProps) {
  const lucro = receita - custo;
  const margemPct = receita > 0 ? (lucro / receita) * 100 : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Receita */}
      <Card className="bg-emerald-500/10 border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span>Receita</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(receita)}
          </div>
        </CardContent>
      </Card>

      {/* Custo */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span>Custo</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(custo)}
          </div>
        </CardContent>
      </Card>

      {/* Lucro */}
      <Card className={cn(
        lucro >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20'
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {lucro >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span>Lucro</span>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            lucro >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
          )}>
            {formatCurrency(lucro)}
          </div>
        </CardContent>
      </Card>

      {/* Margem */}
      <Card className={getMargemBgColor(margemPct)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Percent className="h-4 w-4" />
            <span>Margem</span>
          </div>
          <div className={cn("text-2xl font-bold", getMargemColor(margemPct))}>
            {margemPct.toFixed(1)}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
