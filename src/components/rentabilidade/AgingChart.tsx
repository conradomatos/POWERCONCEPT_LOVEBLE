import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/currency";

interface AgingData {
  vencimento: string;
  valor: number;
}

interface AgingChartProps {
  data: AgingData[];
  title: string;
  tipo: 'receber' | 'pagar';
  className?: string;
}

const AGING_RANGES = [
  { key: 'a_vencer', label: 'A vencer', color: '#22c55e' },
  { key: 'vencido_30', label: '1-30 dias', color: '#eab308' },
  { key: 'vencido_60', label: '31-60 dias', color: '#f97316' },
  { key: 'vencido_90', label: '61-90 dias', color: '#ef4444' },
  { key: 'vencido_90_plus', label: '>90 dias', color: '#991b1b' },
];

function categorizeByAging(data: AgingData[]): { faixa: string; valor: number; color: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const aging = {
    a_vencer: 0,
    vencido_30: 0,
    vencido_60: 0,
    vencido_90: 0,
    vencido_90_plus: 0,
  };

  data.forEach((item) => {
    const vencimento = new Date(item.vencimento);
    vencimento.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      aging.a_vencer += item.valor;
    } else if (diffDays <= 30) {
      aging.vencido_30 += item.valor;
    } else if (diffDays <= 60) {
      aging.vencido_60 += item.valor;
    } else if (diffDays <= 90) {
      aging.vencido_90 += item.valor;
    } else {
      aging.vencido_90_plus += item.valor;
    }
  });

  return AGING_RANGES.map((range) => ({
    faixa: range.label,
    valor: aging[range.key as keyof typeof aging],
    color: range.color,
  })).filter((item) => item.valor > 0);
}

export function AgingChart({ data, title, tipo, className }: AgingChartProps) {
  const chartData = useMemo(() => categorizeByAging(data), [data]);

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.valor, 0), [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum título {tipo === 'receber' ? 'a receber' : 'a pagar'} em aberto
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <span className="text-sm font-semibold">{formatCurrency(total)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 70, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => 
                value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)
              }
              fontSize={11}
            />
            <YAxis
              type="category"
              dataKey="faixa"
              fontSize={11}
              width={65}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Valor']}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
