import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHistogram } from '@/hooks/orcamentos/useHistogram';
import { useLaborRoles } from '@/hooks/orcamentos/useLaborRoles';
import { formatCurrency } from '@/lib/currency';
import { BarChart2, Plus } from 'lucide-react';
import { format, addMonths, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BudgetRevision } from '@/lib/orcamentos/types';

interface OutletContextType {
  budget: any;
  selectedRevision: BudgetRevision | undefined;
  lockState: { isLocked: boolean };
}

export default function Histograma() {
  const context = useOutletContext<OutletContextType>();
  const { selectedRevision, lockState } = context || {};
  
  const { entries, totalsByMonth, totalsByRole, grandTotal, isLoading, upsertEntry } = useHistogram(selectedRevision?.id);
  const { roles } = useLaborRoles(selectedRevision?.id);

  const [newEntry, setNewEntry] = useState({
    labor_role_id: '',
    mes_ref: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    hh_normais: 0,
    hh_50: 0,
    hh_100: 0,
  });

  // Get unique months from entries
  const months = [...new Set(entries.map((e) => e.mes_ref))].sort();
  
  // Get unique roles from entries
  const roleIds = [...new Set(entries.map((e) => e.labor_role_id))];
  
  // Build pivot data: role -> month -> entry
  const pivotData = entries.reduce((acc, entry) => {
    if (!acc[entry.labor_role_id]) {
      acc[entry.labor_role_id] = {};
    }
    acc[entry.labor_role_id][entry.mes_ref] = entry;
    return acc;
  }, {} as Record<string, Record<string, typeof entries[0]>>);

  const handleAddEntry = async () => {
    if (!newEntry.labor_role_id || !newEntry.mes_ref) return;
    await upsertEntry.mutateAsync(newEntry);
    setNewEntry((prev) => ({ ...prev, hh_normais: 0, hh_50: 0, hh_100: 0 }));
  };

  const _handleCellChange = async (roleId: string, mesRef: string, field: 'hh_normais' | 'hh_50' | 'hh_100', value: number) => { void _handleCellChange;
    const existing = pivotData[roleId]?.[mesRef];
    await upsertEntry.mutateAsync({
      labor_role_id: roleId,
      mes_ref: mesRef,
      hh_normais: field === 'hh_normais' ? value : existing?.hh_normais || 0,
      hh_50: field === 'hh_50' ? value : existing?.hh_50 || 0,
      hh_100: field === 'hh_100' ? value : existing?.hh_100 || 0,
    });
  };

  // Generate next 12 months for selection
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const date = addMonths(startOfMonth(new Date()), i - 6);
    return { value: format(date, 'yyyy-MM-dd'), label: format(date, 'MMM/yyyy', { locale: ptBR }) };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Histograma de Mão de Obra
          </CardTitle>
          <CardDescription>
            Distribuição mensal de HH por função
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Total HH:</span>
          <span className="font-bold">{grandTotal.hh_total.toLocaleString()}</span>
          <span className="text-muted-foreground ml-4">Custo Total:</span>
          <span className="font-bold">{formatCurrency(grandTotal.custo_total)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new entry form */}
        {!lockState?.isLocked && (
          <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-1">
              <label className="text-sm text-muted-foreground">Função</label>
              <Select
                value={newEntry.labor_role_id}
                onValueChange={(v) => setNewEntry((p) => ({ ...p, labor_role_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.funcao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px] space-y-1">
              <label className="text-sm text-muted-foreground">Mês</label>
              <Select
                value={newEntry.mes_ref}
                onValueChange={(v) => setNewEntry((p) => ({ ...p, mes_ref: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[100px] space-y-1">
              <label className="text-sm text-muted-foreground">HH Normal</label>
              <Input
                type="number"
                value={newEntry.hh_normais}
                onChange={(e) => setNewEntry((p) => ({ ...p, hh_normais: Number(e.target.value) }))}
              />
            </div>
            <div className="w-[100px] space-y-1">
              <label className="text-sm text-muted-foreground">HH 50%</label>
              <Input
                type="number"
                value={newEntry.hh_50}
                onChange={(e) => setNewEntry((p) => ({ ...p, hh_50: Number(e.target.value) }))}
              />
            </div>
            <div className="w-[100px] space-y-1">
              <label className="text-sm text-muted-foreground">HH 100%</label>
              <Input
                type="number"
                value={newEntry.hh_100}
                onChange={(e) => setNewEntry((p) => ({ ...p, hh_100: Number(e.target.value) }))}
              />
            </div>
            <Button onClick={handleAddEntry} disabled={upsertEntry.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        )}

        {/* Pivot table */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma entrada no histograma</p>
            <p className="text-sm text-muted-foreground">Adicione HH por função e mês</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Função</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-center min-w-[100px]">
                      {format(parseISO(month), 'MMM/yy', { locale: ptBR })}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total HH</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleIds.map((roleId) => {
                  const roleData = totalsByRole[roleId];
                  return (
                    <TableRow key={roleId}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {roleData?.funcao || 'N/A'}
                      </TableCell>
                      {months.map((month) => {
                        const entry = pivotData[roleId]?.[month];
                        return (
                          <TableCell key={month} className="text-center">
                            {entry ? (
                              <span className="font-mono text-sm">{entry.hh_total}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold">
                        {roleData?.hh_total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(roleData?.custo_total || 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="sticky left-0 bg-muted/50">TOTAL</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-center">
                      {totalsByMonth[month]?.hh_total.toLocaleString() || '-'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{grandTotal.hh_total.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotal.custo_total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
