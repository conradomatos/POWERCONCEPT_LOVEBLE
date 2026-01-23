import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { useBudgetSummary } from '@/hooks/orcamentos/useBudgetSummary';
import { formatCurrency } from '@/lib/currency';
import {
  Package,
  HardHat,
  Truck,
  Wrench,
  PencilRuler,
  Calculator,
  BarChart2,
  CalendarClock,
  FileText,
  Layers,
  Settings,
  TrendingUp,
} from 'lucide-react';
import type { BudgetRevision } from '@/lib/orcamentos/types';

interface OutletContextType {
  budget: any;
  selectedRevision: BudgetRevision | undefined;
  lockState: any;
}

export default function VisaoGeral() {
  const { id: budgetId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const context = useOutletContext<OutletContextType>();
  const { selectedRevision } = context || {};
  
  const { summary, isLoading } = useBudgetSummary(selectedRevision?.id);

  const sections = [
    { title: 'Parâmetros', icon: Settings, path: 'parametros', description: 'Impostos, encargos e markup' },
    { title: 'Estrutura WBS', icon: Layers, path: 'estrutura', description: 'Pacotes e atividades' },
    { title: 'Materiais', icon: Package, path: 'materiais', description: 'Lista de materiais e preços' },
    { title: 'Mão de Obra', icon: HardHat, path: 'mao-de-obra', description: 'Funções e custos horários' },
    { title: 'Mobilização', icon: Truck, path: 'mobilizacao', description: 'Custos de mobilização' },
    { title: 'Canteiro', icon: Wrench, path: 'canteiro', description: 'Manutenção do canteiro' },
    { title: 'Equipamentos', icon: Wrench, path: 'equipamentos', description: 'Aluguel de equipamentos' },
    { title: 'Engenharia', icon: PencilRuler, path: 'engenharia', description: 'Custos de engenharia' },
    { title: 'Histograma MO', icon: BarChart2, path: 'histograma', description: 'Distribuição mensal de HH' },
    { title: 'Cronograma', icon: CalendarClock, path: 'cronograma', description: 'Desembolso mensal' },
    { title: 'Resumo de Preços', icon: Calculator, path: 'resumo', description: 'Consolidação e margem' },
    { title: 'Documentos', icon: FileText, path: 'documentos', description: 'Propostas e anexos' },
  ];

  const kpis = [
    { label: 'Materiais', value: summary?.total_materiais || 0, color: 'text-blue-600' },
    { label: 'Mão de Obra', value: summary?.total_mo || 0, color: 'text-green-600' },
    { label: 'Indiretos', value: (summary?.total_mobilizacao || 0) + (summary?.total_canteiro || 0) + (summary?.total_equipamentos || 0) + (summary?.total_engenharia || 0), color: 'text-orange-600' },
    { label: 'Custo Total', value: summary?.subtotal_custo || 0, color: 'text-gray-700' },
    { label: 'Preço de Venda', value: summary?.preco_venda || 0, color: 'text-primary' },
    { label: 'Margem', value: summary?.margem_pct || 0, isPercent: true, color: (summary?.margem_pct || 0) >= 15 ? 'text-green-600' : 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className={`text-xl font-bold ${kpi.color}`}>
                {kpi.isPercent 
                  ? `${Number(kpi.value).toFixed(1)}%`
                  : formatCurrency(Number(kpi.value))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Seções do Orçamento
          </CardTitle>
          <CardDescription>
            Navegue pelas diferentes seções para compor o orçamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sections.map((section) => (
              <Button
                key={section.path}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-accent"
                onClick={() => navigate(`/orcamentos/${budgetId}/${section.path}`)}
              >
                <section.icon className="h-6 w-6 text-primary" />
                <div className="text-center">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
