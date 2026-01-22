import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import { Users } from "lucide-react";

interface MaoObraData {
  colaborador_id: string;
  nome: string;
  cargo: string;
  horas: number;
  custo_hora_medio: number;
  custo_total: number;
}

interface MaoObraTableProps {
  data: MaoObraData[];
}

export function MaoObraTable({ data }: MaoObraTableProps) {
  const totalHoras = data.reduce((sum, d) => sum + d.horas, 0);
  const totalCusto = data.reduce((sum, d) => sum + d.custo_total, 0);
  const custoMedioGeral = totalHoras > 0 ? totalCusto / totalHoras : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Custos de Mão de Obra
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              Total: <span className="font-medium text-foreground">{formatCurrency(totalCusto)}</span>
            </span>
            <span className="text-muted-foreground">
              {totalHoras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} horas
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum registro de mão de obra encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Custo/Hora Médio</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.colaborador_id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{item.cargo}</TableCell>
                    <TableCell className="text-right">
                      {item.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.custo_hora_medio)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.custo_total)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalCusto > 0 
                        ? `${((item.custo_total / totalCusto) * 100).toFixed(1)}%`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">
                    {totalHoras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(custoMedioGeral)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalCusto)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
