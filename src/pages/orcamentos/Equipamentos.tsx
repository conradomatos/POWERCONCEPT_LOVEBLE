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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Trash2, Database, ExternalLink } from 'lucide-react';
import { useEquipmentRentals } from '@/hooks/orcamentos/useEquipmentRentals';
import { useEquipmentCatalog, type EquipmentCatalogItem } from '@/hooks/orcamentos/useEquipmentCatalog';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Equipamentos() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { items, total, isLoading, createFromCatalog, updateItem, deleteItem } = useEquipmentRentals(selectedRevision?.id);
  const { items: catalogItems, isLoading: catalogLoading } = useEquipmentCatalog();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddFromCatalog = async (catalogItem: EquipmentCatalogItem) => {
    await createFromCatalog.mutateAsync({
      catalogId: catalogItem.id,
      quantidade: 1,
      valor_mensal: catalogItem.valor_mensal_ref || 0,
      meses: 1,
    });
    setDialogOpen(false);
  };

  // Filter catalog items based on search
  const filteredCatalog = catalogItems.filter(item => {
    return !searchTerm || item.descricao.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar do Catálogo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Selecionar Equipamento do Catálogo Global
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <Input
                    placeholder="Filtrar por descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="flex-1 overflow-auto">
                    {catalogLoading ? (
                      <p className="text-center py-4 text-muted-foreground">Carregando...</p>
                    ) : filteredCatalog.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor Mensal Ref.</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCatalog.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{item.descricao}</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(item.valor_mensal_ref || 0)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAddFromCatalog(item)}
                                  disabled={createFromCatalog.isPending}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Usar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>{searchTerm ? 'Nenhum equipamento encontrado' : 'Catálogo vazio'}</p>
                        <p className="text-sm mt-1">
                          <a href="/orcamentos/bases/indiretos" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                            Cadastrar no catálogo global
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Descrição</TableHead>
                <TableHead className="w-24 text-right">Qtd</TableHead>
                <TableHead className="w-32 text-right">Valor Mensal</TableHead>
                <TableHead className="w-24 text-right">Meses</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum equipamento adicionado</p>
                    <p className="text-sm">Clique em "Adicionar do Catálogo" para começar</p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isFromCatalog = !!item.catalog_id;
                  return (
                    <TableRow key={item.id}>
                      {/* Descrição - read-only se veio do catálogo */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              "block px-2 py-1 rounded",
                              isFromCatalog 
                                ? "bg-muted text-muted-foreground cursor-help" 
                                : "bg-background"
                            )}>
                              {item.descricao}
                            </span>
                          </TooltipTrigger>
                          {isFromCatalog && (
                            <TooltipContent>
                              <p>Valor do catálogo global (não editável)</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      
                      {/* Quantidade - EDITÁVEL */}
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => updateItem.mutate({ id: item.id, quantidade: parseFloat(e.target.value) || 0 })}
                          disabled={lockState.isLocked}
                          className={cn(
                            "h-8 text-right w-16",
                            "bg-primary/5 border-primary/20 focus:border-primary"
                          )}
                        />
                      </TableCell>
                      
                      {/* Valor Mensal - EDITÁVEL */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valor_mensal}
                              onChange={(e) => updateItem.mutate({ id: item.id, valor_mensal: parseFloat(e.target.value) || 0 })}
                              disabled={lockState.isLocked}
                              className={cn(
                                "h-8 text-right",
                                "bg-primary/5 border-primary/20 focus:border-primary"
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Valor específico deste orçamento</p>
                            {item.valor_referencia && (
                              <p className="text-muted-foreground">
                                Ref. catálogo: {formatCurrency(item.valor_referencia)}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      
                      {/* Meses - EDITÁVEL */}
                      <TableCell>
                        <Input
                          type="number"
                          value={item.meses}
                          onChange={(e) => updateItem.mutate({ id: item.id, meses: parseInt(e.target.value) || 1 })}
                          disabled={lockState.isLocked}
                          className={cn(
                            "h-8 text-right w-16",
                            "bg-primary/5 border-primary/20 focus:border-primary"
                          )}
                        />
                      </TableCell>
                      
                      {/* Total - calculado */}
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(item.total || 0)}
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItem.mutate(item.id)}
                          disabled={lockState.isLocked}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
            {/* Legend */}
            {items.length > 0 && (
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted border"></div>
                  <span>Catálogo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary/5 border border-primary/20"></div>
                  <span>Editável</span>
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
    </TooltipProvider>
  );
}
