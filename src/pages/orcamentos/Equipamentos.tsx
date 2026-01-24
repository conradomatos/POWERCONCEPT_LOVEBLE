import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package, RotateCcw, AlertCircle } from 'lucide-react';
import { useBudgetEquipmentItems, type BudgetEquipmentItem } from '@/hooks/orcamentos/useBudgetEquipmentItems';
import { type EquipmentCatalogItem } from '@/hooks/orcamentos/useEquipmentCatalogNew';
import { BudgetEquipmentCatalogPickerModal } from '@/components/orcamentos/BudgetEquipmentCatalogPickerModal';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Equipamentos() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const {
    items,
    total,
    isLoading,
    addBatchFromCatalog,
    updateItem,
    resetToReference,
    deleteItem,
    getEffectivePrice,
  } = useBudgetEquipmentItems(selectedRevision?.id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddFromCatalog = async (catalogItems: EquipmentCatalogItem[]) => {
    setIsAdding(true);
    try {
      await addBatchFromCatalog.mutateAsync(catalogItems);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateField = (item: BudgetEquipmentItem, field: string, value: number) => {
    // Validate
    if (field === 'qtd' && value <= 0) return;
    if (field === 'meses' && value <= 0) return;
    if (field === 'preco_mensal_override' && value < 0) return;

    updateItem.mutate({ id: item.id, [field]: value });
  };

  const handleResetPrice = (item: BudgetEquipmentItem) => {
    resetToReference.mutate(item.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Locação de Equipamentos</CardTitle>
            <CardDescription>
              Selecione equipamentos do catálogo global e defina valores específicos para este orçamento
            </CardDescription>
          </div>
          {!lockState.isLocked && (
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar do Catálogo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[300px]">Equipamento</TableHead>
                <TableHead className="w-24 text-right">Qtd</TableHead>
                <TableHead className="w-36 text-right">Valor Mensal</TableHead>
                <TableHead className="w-24 text-right">Meses</TableHead>
                <TableHead className="w-36 text-right">Total</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum equipamento adicionado</p>
                    <p className="text-sm">Clique em "Adicionar do Catálogo" para começar</p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const effectivePrice = getEffectivePrice(item);
                  const hasOverride = item.preco_mensal_override !== null;
                  const isFromCatalog = !!item.catalog_id;

                  return (
                    <TableRow key={item.id}>
                      {/* Descrição - snapshot, read-only */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.codigo_snapshot && (
                                <span className="font-mono text-muted-foreground mr-2">
                                  {item.codigo_snapshot}
                                </span>
                              )}
                              {item.descricao_snapshot}
                            </span>
                            {isFromCatalog && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs">
                                    Catálogo
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Origem: Catálogo Global de Equipamentos</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {hasOverride && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Override
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Preço modificado neste orçamento</p>
                                  <p className="text-muted-foreground">
                                    Referência: {formatCurrency(item.preco_mensal_ref_snapshot)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {item.unidade_snapshot && (
                            <span className="text-xs text-muted-foreground">
                              Unidade: {item.unidade_snapshot}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Quantidade - editável */}
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.qtd}
                          onChange={(e) => handleUpdateField(item, 'qtd', parseFloat(e.target.value) || 1)}
                          disabled={lockState.isLocked}
                          className={cn(
                            "h-8 text-right w-20",
                            "bg-primary/5 border-primary/20 focus:border-primary"
                          )}
                        />
                      </TableCell>

                      {/* Valor Mensal - editável (override) */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={effectivePrice}
                              onChange={(e) => handleUpdateField(item, 'preco_mensal_override', parseFloat(e.target.value) || 0)}
                              disabled={lockState.isLocked}
                              className={cn(
                                "h-8 text-right",
                                hasOverride
                                  ? "bg-secondary border-secondary"
                                  : "bg-primary/5 border-primary/20 focus:border-primary"
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Valor mensal deste orçamento</p>
                            <p className="text-muted-foreground">
                              Ref. catálogo: {formatCurrency(item.preco_mensal_ref_snapshot)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Meses - editável */}
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.meses}
                          onChange={(e) => handleUpdateField(item, 'meses', parseInt(e.target.value) || 1)}
                          disabled={lockState.isLocked}
                          className={cn(
                            "h-8 text-right w-20",
                            "bg-primary/5 border-primary/20 focus:border-primary"
                          )}
                        />
                      </TableCell>

                      {/* Total - calculado */}
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(item.total || 0)}
                      </TableCell>

                      {/* Ações */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {hasOverride && !lockState.isLocked && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResetPrice(item)}
                                  className="h-8 w-8"
                                >
                                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Resetar para preço de referência</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteItem.mutate(item.id)}
                            disabled={lockState.isLocked}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <div className="flex justify-between w-full items-center">
            {/* Legenda */}
            {items.length > 0 && (
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary/5 border border-primary/20"></div>
                  <span>Editável</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-secondary border border-border"></div>
                  <span>Override (modificado)</span>
                </div>
              </div>
            )}
            <div className="text-right ml-auto">
              <p className="text-sm text-muted-foreground">Total Equipamentos</p>
              <p className="text-2xl font-bold font-mono">{formatCurrency(total)}</p>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Modal para selecionar do catálogo */}
      <BudgetEquipmentCatalogPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={handleAddFromCatalog}
        isAdding={isAdding}
      />
    </TooltipProvider>
  );
}
