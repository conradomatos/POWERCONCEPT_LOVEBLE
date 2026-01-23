import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Package, 
  Users, 
  DollarSign, 
  FileText,
  BarChart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationChecklistProps {
  materials: {
    total: number;
    withoutPrice: number;
    withoutHh: number;
  };
  laborRoles: {
    total: number;
    withoutCost: number;
  };
  wbs: {
    total: number;
    empty: number;
  };
  histogram: {
    hasData: boolean;
  };
  summary: {
    calculated: boolean;
    precoVenda: number;
  };
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'success' | 'warning' | 'error';
  detail?: string;
}

export function ValidationChecklist({
  materials,
  laborRoles,
  wbs,
  histogram,
  summary,
}: ValidationChecklistProps) {
  const checks = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [];

    // Materials check
    if (materials.total === 0) {
      items.push({
        id: 'materials-empty',
        label: 'Materiais',
        description: 'Nenhum material cadastrado',
        icon: <Package className="h-4 w-4" />,
        status: 'error',
      });
    } else if (materials.withoutPrice > 0) {
      items.push({
        id: 'materials-price',
        label: 'Materiais',
        description: `${materials.withoutPrice} item(s) sem preço unitário`,
        icon: <Package className="h-4 w-4" />,
        status: 'warning',
        detail: `${materials.total} materiais cadastrados`,
      });
    } else {
      items.push({
        id: 'materials-ok',
        label: 'Materiais',
        description: `${materials.total} itens com preço configurado`,
        icon: <Package className="h-4 w-4" />,
        status: 'success',
      });
    }

    // Labor roles check
    if (laborRoles.total === 0) {
      items.push({
        id: 'labor-empty',
        label: 'Mão de Obra',
        description: 'Nenhuma função cadastrada',
        icon: <Users className="h-4 w-4" />,
        status: 'warning',
      });
    } else if (laborRoles.withoutCost > 0) {
      items.push({
        id: 'labor-cost',
        label: 'Mão de Obra',
        description: `${laborRoles.withoutCost} função(ões) sem custo hora`,
        icon: <Users className="h-4 w-4" />,
        status: 'warning',
        detail: `${laborRoles.total} funções cadastradas`,
      });
    } else {
      items.push({
        id: 'labor-ok',
        label: 'Mão de Obra',
        description: `${laborRoles.total} funções configuradas`,
        icon: <Users className="h-4 w-4" />,
        status: 'success',
      });
    }

    // WBS check
    if (wbs.total === 0) {
      items.push({
        id: 'wbs-empty',
        label: 'Estrutura WBS',
        description: 'Nenhuma estrutura definida',
        icon: <FileText className="h-4 w-4" />,
        status: 'warning',
      });
    } else if (wbs.empty > 0) {
      items.push({
        id: 'wbs-items',
        label: 'Estrutura WBS',
        description: `${wbs.empty} item(s) WBS sem materiais vinculados`,
        icon: <FileText className="h-4 w-4" />,
        status: 'warning',
        detail: `${wbs.total} itens WBS`,
      });
    } else {
      items.push({
        id: 'wbs-ok',
        label: 'Estrutura WBS',
        description: `${wbs.total} itens estruturados`,
        icon: <FileText className="h-4 w-4" />,
        status: 'success',
      });
    }

    // Histogram check
    if (!histogram.hasData) {
      items.push({
        id: 'histogram-empty',
        label: 'Histograma',
        description: 'Distribuição mensal não configurada',
        icon: <BarChart className="h-4 w-4" />,
        status: 'warning',
      });
    } else {
      items.push({
        id: 'histogram-ok',
        label: 'Histograma',
        description: 'Distribuição mensal configurada',
        icon: <BarChart className="h-4 w-4" />,
        status: 'success',
      });
    }

    // Summary check
    if (!summary.calculated) {
      items.push({
        id: 'summary-not-calc',
        label: 'Resumo de Preços',
        description: 'Resumo não calculado',
        icon: <DollarSign className="h-4 w-4" />,
        status: 'error',
      });
    } else if (summary.precoVenda === 0) {
      items.push({
        id: 'summary-zero',
        label: 'Resumo de Preços',
        description: 'Preço de venda é zero',
        icon: <DollarSign className="h-4 w-4" />,
        status: 'warning',
      });
    } else {
      items.push({
        id: 'summary-ok',
        label: 'Resumo de Preços',
        description: 'Cálculo atualizado',
        icon: <DollarSign className="h-4 w-4" />,
        status: 'success',
      });
    }

    return items;
  }, [materials, laborRoles, wbs, histogram, summary]);

  const errorCount = checks.filter((c) => c.status === 'error').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const successCount = checks.filter((c) => c.status === 'success').length;

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Checklist de Validação</CardTitle>
          <div className="flex gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {errorCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                {warningCount}
              </Badge>
            )}
            {successCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3" />
                {successCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg',
                check.status === 'error' && 'bg-destructive/10',
                check.status === 'warning' && 'bg-amber-50',
                check.status === 'success' && 'bg-green-50'
              )}
            >
              <div className="mt-0.5">{check.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{check.label}</span>
                  {getStatusIcon(check.status)}
                </div>
                <p className="text-sm text-muted-foreground">{check.description}</p>
                {check.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
