import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TituloAR {
  id: string;
  id_omie_titulo: number;
  numero_documento?: string;
  cliente?: string;
  data_emissao: string;
  vencimento: string;
  valor: number;
  valor_recebido: number;
  status: string;
  parcela?: string;
  categoria?: string;
}

interface TituloAP {
  id: string;
  id_omie_titulo: number;
  numero_documento?: string;
  fornecedor?: string;
  data_emissao: string;
  vencimento: string;
  valor: number;
  valor_pago: number;
  status: string;
  parcela?: string;
  categoria?: string;
}

interface TitulosTableProps {
  titulosAR: TituloAR[];
  titulosAP: TituloAP[];
}

const statusColors: Record<string, string> = {
  ABERTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PAGO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ATRASADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CANCELADO: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function TitulosTable({ titulosAR, titulosAP }: TitulosTableProps) {
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'ar' | 'ap'>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Combine and normalize data
  const allTitulos = [
    ...titulosAR.map(t => ({
      id: t.id,
      tipo: 'AR' as const,
      numero: t.numero_documento || '-',
      entidade: t.cliente || 'Cliente não informado',
      emissao: t.data_emissao,
      vencimento: t.vencimento,
      valor: Number(t.valor),
      valorPago: Number(t.valor_recebido),
      saldo: Number(t.valor) - Number(t.valor_recebido),
      status: t.status,
      parcela: t.parcela,
      categoria: t.categoria,
    })),
    ...titulosAP.map(t => ({
      id: t.id,
      tipo: 'AP' as const,
      numero: t.numero_documento || '-',
      entidade: t.fornecedor || 'Fornecedor não informado',
      emissao: t.data_emissao,
      vencimento: t.vencimento,
      valor: Number(t.valor),
      valorPago: Number(t.valor_pago),
      saldo: Number(t.valor) - Number(t.valor_pago),
      status: t.status,
      parcela: t.parcela,
      categoria: t.categoria,
    })),
  ].sort((a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());

  // Filter
  const filteredTitulos = allTitulos.filter(t => {
    if (tipoFilter !== 'todos' && t.tipo.toLowerCase() !== tipoFilter) return false;
    if (statusFilter !== 'todos' && t.status !== statusFilter) return false;
    return true;
  });

  // Totals
  const totaisAR = titulosAR.reduce((sum, t) => sum + Number(t.valor), 0);
  const totaisAP = titulosAP.reduce((sum, t) => sum + Number(t.valor), 0);

  // Unique statuses
  const statuses = [...new Set(allTitulos.map(t => t.status))];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-base">Títulos Financeiros (Omie)</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as 'todos' | 'ar' | 'ap')}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ar">A Receber</SelectItem>
                <SelectItem value="ap">A Pagar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <ArrowUpRight className="h-4 w-4" />
            A Receber: {formatCurrency(totaisAR)}
          </span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <ArrowDownRight className="h-4 w-4" />
            A Pagar: {formatCurrency(totaisAP)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTitulos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum título encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Tipo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Pago/Recebido</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTitulos.map((titulo) => (
                  <TableRow key={titulo.id}>
                    <TableCell>
                      <Badge variant={titulo.tipo === 'AR' ? 'default' : 'secondary'}>
                        {titulo.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {titulo.numero}
                      {titulo.parcela && (
                        <span className="text-muted-foreground ml-1">({titulo.parcela})</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={titulo.entidade}>
                      {titulo.entidade}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(titulo.emissao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(titulo.vencimento).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(titulo.valor)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(titulo.valorPago)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(titulo.saldo)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[titulo.status] || ''}>
                        {titulo.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
