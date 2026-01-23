import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useBudgetSummary } from '@/hooks/orcamentos/useBudgetSummary';
import { formatCurrency } from '@/lib/currency';
import { Calculator, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { BudgetRevision } from '@/lib/orcamentos/types';

interface OutletContextType {
  budget: any;
  selectedRevision: BudgetRevision | undefined;
  lockState: { isLocked: boolean };
}

export default function ResumoPrecos() {
  const context = useOutletContext<OutletContextType>();
  const { selectedRevision, lockState } = context || {};
  
  const { summary, isLoading, recalculate } = useBudgetSummary(selectedRevision?.id);

  const handleRecalculate = async () => {
    await recalculate.mutateAsync();
  };

  const margemOk = (summary?.margem_pct || 0) >= 15;

  // Cost breakdown items
  const costItems = [
    { label: 'Materiais', value: summary?.total_materiais || 0, sublabel: `${summary?.total_hh_materiais || 0} HH` },
    { label: 'Mão de Obra', value: summary?.total_mo || 0 },
    { label: 'Mobilização', value: summary?.total_mobilizacao || 0 },
    { label: 'Canteiro', value: summary?.total_canteiro || 0 },
    { label: 'Equipamentos', value: summary?.total_equipamentos || 0 },
    { label: 'Engenharia', value: summary?.total_engenharia || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header with recalculate button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Resumo de Preços
          </h2>
          <p className="text-muted-foreground">Consolidação de custos, markup e margem</p>
        </div>
        {!lockState?.isLocked && (
          <Button onClick={handleRecalculate} disabled={recalculate.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} />
            Recalcular Tudo
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : !summary ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Resumo não calculado</p>
            <Button onClick={handleRecalculate} disabled={recalculate.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Calcular Resumo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Composição de Custos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {costItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{item.label}</span>
                    {item.sublabel && (
                      <span className="text-sm text-muted-foreground ml-2">({item.sublabel})</span>
                    )}
                  </div>
                  <span className="font-mono">{formatCurrency(item.value)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between py-2 font-bold text-lg">
                <span>Subtotal Custo</span>
                <span className="font-mono">{formatCurrency(summary.subtotal_custo)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Price Formation */}
          <Card>
            <CardHeader>
              <CardTitle>Formação de Preço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span>Custo Total</span>
                <span className="font-mono">{formatCurrency(summary.subtotal_custo)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-primary">
                <span>+ Markup ({summary.markup_pct_aplicado}%)</span>
                <span className="font-mono">{formatCurrency(summary.valor_markup)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-orange-600">
                <span>+ Impostos</span>
                <span className="font-mono">{formatCurrency(summary.total_impostos)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 font-bold text-lg">
                <span>Preço de Venda</span>
                <span className="font-mono text-primary">{formatCurrency(summary.preco_venda)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Margin Analysis */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {margemOk ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                Análise de Margem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.subtotal_custo)}</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Impostos</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_impostos)}</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Margem (R$)</p>
                  <p className={`text-2xl font-bold ${margemOk ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.margem_rs)}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${margemOk ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-sm text-muted-foreground">Margem (%)</p>
                  <p className={`text-3xl font-bold ${margemOk ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.margem_pct.toFixed(1)}%
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {margemOk ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600">Acima de 15%</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-xs text-red-600">Abaixo de 15%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
