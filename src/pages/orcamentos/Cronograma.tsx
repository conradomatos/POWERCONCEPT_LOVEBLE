import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCashflow, CASHFLOW_CATEGORIES } from '@/hooks/orcamentos/useCashflow';
import { useRevisions } from '@/hooks/orcamentos/useRevisions';
import { formatCurrency } from '@/lib/currency';
import { CalendarClock, RefreshCw, Wand2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BudgetRevision } from '@/lib/orcamentos/types';

interface OutletContextType {
  budget: any;
  selectedRevision: BudgetRevision | undefined;
  lockState: { isLocked: boolean };
}

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAIS: 'Materiais',
  MO: 'Mão de Obra',
  MOBILIZACAO: 'Mobilização',
  CANTEIRO: 'Canteiro',
  EQUIPAMENTOS: 'Equipamentos',
  ENGENHARIA: 'Engenharia',
};

export default function Cronograma() {
  const context = useOutletContext<OutletContextType>();
  const { selectedRevision, lockState } = context || {};
  
  const { entries, totalsByMonth, totalsByCategory, grandTotal, isLoading, generateFromBudget } = useCashflow(selectedRevision?.id);
  
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [prazoMeses, setPrazoMeses] = useState(selectedRevision?.prazo_execucao_meses || 12);

  // Get unique months
  const months = [...new Set(entries.map((e) => e.mes_ref))].sort();
  
  // Build pivot data: category -> month -> value
  const pivotData = entries.reduce((acc, entry) => {
    if (!acc[entry.categoria]) {
      acc[entry.categoria] = {};
    }
    acc[entry.categoria][entry.mes_ref] = entry.valor;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const handleGenerate = async () => {
    await generateFromBudget.mutateAsync(prazoMeses);
    setGenerateDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Cronograma de Desembolso
          </CardTitle>
          <CardDescription>
            Projeção mensal de custos por categoria
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold ml-2">{formatCurrency(grandTotal)}</span>
          </div>
          {!lockState?.isLocked && (
            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Gerar Cronograma
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar Cronograma de Desembolso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    O cronograma será gerado distribuindo os custos do resumo de preços 
                    uniformemente ao longo do prazo de execução.
                  </p>
                  <div className="space-y-2">
                    <Label>Prazo de Execução (meses)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={prazoMeses}
                      onChange={(e) => setPrazoMeses(Number(e.target.value))}
                    />
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                    <strong>Atenção:</strong> Esta ação substituirá o cronograma atual.
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGenerate} disabled={generateFromBudget.isPending}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Gerar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Cronograma não gerado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Gerar Cronograma" para distribuir os custos mensalmente
            </p>
            {!lockState?.isLocked && (
              <Button variant="outline" onClick={() => setGenerateDialogOpen(true)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar Cronograma
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Categoria</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right min-w-[120px]">
                      {format(parseISO(month), 'MMM/yy', { locale: ptBR })}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CASHFLOW_CATEGORIES.map((categoria) => {
                  const categoryTotal = totalsByCategory[categoria] || 0;
                  if (categoryTotal === 0) return null;
                  
                  return (
                    <TableRow key={categoria}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {CATEGORY_LABELS[categoria]}
                      </TableCell>
                      {months.map((month) => (
                        <TableCell key={month} className="text-right font-mono">
                          {pivotData[categoria]?.[month] 
                            ? formatCurrency(pivotData[categoria][month])
                            : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {formatCurrency(categoryTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="sticky left-0 bg-muted/50">TOTAL MENSAL</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      {formatCurrency(totalsByMonth[month] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
