import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface Pendencia {
  id: string;
  tipo: string;
  origem: string;
  referencia_id: string;
  referencia_omie_codigo?: number | null;
  projeto_id?: string | null;
  status: string;
  detalhes?: unknown;
  created_at: string;
}

interface PendenciasTableProps {
  data: Pendencia[];
  projetoId: string;
}

const tipoLabels: Record<string, string> = {
  PROJETO_NAO_ENCONTRADO: 'Projeto não encontrado',
  PROJETO_SEM_VINCULO: 'Sem vínculo com projeto',
  VALOR_DIVERGENTE: 'Valor divergente',
  OUTRO: 'Outro',
};

const origemLabels: Record<string, string> = {
  AR: 'Contas a Receber',
  AP: 'Contas a Pagar',
};

export function PendenciasTable({ data, projetoId }: PendenciasTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <p className="text-lg font-medium">Nenhuma pendência</p>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os registros financeiros estão devidamente vinculados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pendências Financeiras
          </CardTitle>
          <Badge variant="destructive">{data.length} pendência(s)</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Código Omie</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pendencia) => (
                <TableRow key={pendencia.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {tipoLabels[pendencia.tipo] || pendencia.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{origemLabels[pendencia.origem] || pendencia.origem}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {pendencia.referencia_omie_codigo || '-'}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    {pendencia.detalhes && typeof pendencia.detalhes === 'object' ? (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {(pendencia.detalhes as Record<string, unknown>).cliente && (
                          <div>Cliente: {String((pendencia.detalhes as Record<string, unknown>).cliente)}</div>
                        )}
                        {(pendencia.detalhes as Record<string, unknown>).fornecedor && (
                          <div>Fornecedor: {String((pendencia.detalhes as Record<string, unknown>).fornecedor)}</div>
                        )}
                        {(pendencia.detalhes as Record<string, unknown>).valor && (
                          <div>Valor: {formatCurrency(Number((pendencia.detalhes as Record<string, unknown>).valor))}</div>
                        )}
                        {(pendencia.detalhes as Record<string, unknown>).numero_documento && (
                          <div>Doc: {String((pendencia.detalhes as Record<string, unknown>).numero_documento)}</div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(pendencia.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled>
                      Resolver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Para resolver pendências, acesse a tela de pendências do portfólio.
        </p>
      </CardContent>
    </Card>
  );
}
