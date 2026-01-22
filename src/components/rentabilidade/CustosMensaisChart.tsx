import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/currency";
import { BarChart3 } from "lucide-react";

interface MonthlyData {
  mes: string;
  receita: number;
  custo_direto: number;
  custo_mo: number;
}

interface CustosMensaisChartProps {
  data: MonthlyData[];
}

export function CustosMensaisChart({ data }: CustosMensaisChartProps) {
  const chartData = data.map(d => ({
    ...d,
    mesLabel: formatMonth(d.mes),
    resultado: d.receita - d.custo_direto - d.custo_mo,
  }));

  function formatMonth(mes: string): string {
    const [year, month] = mes.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Evolução Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="mesLabel" 
              fontSize={11} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              fontSize={11}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'receita' ? 'Receita' 
                  : name === 'custo_direto' ? 'Custos Diretos'
                  : name === 'custo_mo' ? 'Mão de Obra'
                  : 'Resultado'
              ]}
              labelFormatter={(label) => `Mês: ${label}`}
            />
            <Legend 
              formatter={(value) => 
                value === 'receita' ? 'Receita' 
                  : value === 'custo_direto' ? 'Custos Diretos'
                  : value === 'custo_mo' ? 'Mão de Obra'
                  : 'Resultado'
              }
            />
            <Line
              type="monotone"
              dataKey="receita"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="custo_direto"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="custo_mo"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="resultado"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
