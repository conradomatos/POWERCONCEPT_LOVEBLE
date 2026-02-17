import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Trash2, Search, Database, ExternalLink } from 'lucide-react';
import { useMaterials } from '@/hooks/orcamentos/useMaterials';
import { useMaterialCatalog, type CatalogItem } from '@/hooks/orcamentos/useMaterialCatalog';
import { SUPPLY_TYPE_CONFIG } from '@/lib/orcamentos/types';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Materiais() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { items, totals, isLoading, createFromCatalog, updateItem, deleteItem } = useMaterials(selectedRevision?.id);
  const { searchCatalog } = useMaterialCatalog();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSearch = async () => {
    if (searchTerm.length < 2) return;
    setIsSearching(true);
    const results = await searchCatalog(searchTerm);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleAddFromCatalog = async (catalogItem: CatalogItem) => {
    await createFromCatalog.mutateAsync({
      catalogId: catalogItem.id,
      quantidade: 1,
      preco_unit: catalogItem.preco_ref ?? 0,
      fator_dificuldade: 1,
      fornecimento: 'A_DEFINIR',
    });
    setDialogOpen(false);
  };

  const handleUpdateField = async (id: string, field: string, value: string | number) => {
    await updateItem.mutateAsync({ id, [field]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando materiais...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Levantamento de Materiais</CardTitle>
            <CardDescription>
              Selecione materiais do catálogo global e defina preços específicos para este orçamento
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
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Selecionar Material do Catálogo Global
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite código ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching || searchTerm.length < 2}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {searchResults.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Un</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">HH Ref</TableHead>
                            <TableHead className="text-right">Preço Ref</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/50">
                              <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                              <TableCell className="text-xs">{item.descricao}</TableCell>
                              <TableCell className="text-xs">{item.unidade}</TableCell>
                              <TableCell className="text-xs">{item.categoria || '-'}</TableCell>
                              <TableCell className="text-right text-xs font-mono">
                                {item.hh_unit_ref?.toFixed(2) ?? '-'}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono">
                                {formatCurrency(item.preco_ref ?? 0)}
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
                    )}
                    {searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum material encontrado</p>
                        <p className="text-sm mt-1">
                          <a href="/orcamentos/bases/materiais" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                            Cadastrar no catálogo global
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                    )}
                    {searchTerm.length < 2 && searchResults.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Digite pelo menos 2 caracteres para buscar</p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="w-16">Un</TableHead>
                  <TableHead className="w-20 text-right">Qtd</TableHead>
                  <TableHead className="w-28">Fornec.</TableHead>
                  <TableHead className="w-20 text-right">HH Unit</TableHead>
                  <TableHead className="w-16 text-right">Fator</TableHead>
                  <TableHead className="w-20 text-right">HH Total</TableHead>
                  <TableHead className="w-28 text-right">Preço Unit</TableHead>
                  <TableHead className="w-28 text-right">Preço Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum material adicionado</p>
                      <p className="text-sm">Clique em "Adicionar do Catálogo" para começar</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const isFromCatalog = !!item.catalog_id;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.item_seq}</TableCell>
                        
                        {/* Código - read-only se veio do catálogo */}
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "font-mono text-xs block px-2 py-1 rounded",
                                isFromCatalog 
                                  ? "bg-muted text-muted-foreground cursor-help" 
                                  : "bg-background"
                              )}>
                                {item.codigo || '-'}
                              </span>
                            </TooltipTrigger>
                            {isFromCatalog && (
                              <TooltipContent>
                                <p>Valor do catálogo global (não editável)</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        
                        {/* Descrição - read-only se veio do catálogo */}
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "text-xs block px-2 py-1 rounded truncate max-w-[200px]",
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
                        
                        {/* Unidade - read-only se veio do catálogo */}
                        <TableCell>
                          <span className={cn(
                            "text-xs block px-2 py-1 rounded text-center",
                            isFromCatalog 
                              ? "bg-muted text-muted-foreground" 
                              : "bg-background"
                          )}>
                            {item.unidade}
                          </span>
                        </TableCell>
                        
                        {/* Quantidade - EDITÁVEL (específico do orçamento) */}
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateField(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                            disabled={lockState.isLocked}
                            className={cn(
                              "h-8 text-xs text-right",
                              "bg-primary/5 border-primary/20 focus:border-primary"
                            )}
                          />
                        </TableCell>
                        
                        {/* Fornecimento - EDITÁVEL */}
                        <TableCell>
                          <Select
                            value={item.fornecimento}
                            onValueChange={(value) => handleUpdateField(item.id, 'fornecimento', value)}
                            disabled={lockState.isLocked}
                          >
                            <SelectTrigger className="h-8 text-xs bg-primary/5 border-primary/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SUPPLY_TYPE_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        
                        {/* HH Unitário - read-only (vem do catálogo) */}
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "text-xs block px-2 py-1 rounded text-right font-mono",
                                isFromCatalog 
                                  ? "bg-muted text-muted-foreground cursor-help" 
                                  : "bg-background"
                              )}>
                                {item.hh_unitario?.toFixed(2) ?? '0.00'}
                              </span>
                            </TooltipTrigger>
                            {isFromCatalog && (
                              <TooltipContent>
                                <p>HH padrão do catálogo (não editável)</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        
                        {/* Fator de dificuldade - EDITÁVEL */}
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={item.fator_dificuldade}
                            onChange={(e) => handleUpdateField(item.id, 'fator_dificuldade', parseFloat(e.target.value) || 1)}
                            disabled={lockState.isLocked}
                            className={cn(
                              "h-8 text-xs text-right w-14",
                              "bg-primary/5 border-primary/20 focus:border-primary"
                            )}
                          />
                        </TableCell>
                        
                        {/* HH Total - calculado */}
                        <TableCell className="text-right font-mono text-xs">
                          {(item.hh_total || 0).toFixed(2)}
                        </TableCell>
                        
                        {/* Preço Unitário - EDITÁVEL (específico do orçamento) */}
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.preco_unit}
                                onChange={(e) => handleUpdateField(item.id, 'preco_unit', parseFloat(e.target.value) || 0)}
                                disabled={lockState.isLocked}
                                className={cn(
                                  "h-8 text-xs text-right",
                                  "bg-primary/5 border-primary/20 focus:border-primary"
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Preço específico deste orçamento</p>
                              {item.preco_referencia && (
                                <p className="text-muted-foreground">
                                  Ref. catálogo: {formatCurrency(item.preco_referencia)}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        
                        {/* Preço Total - calculado */}
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatCurrency(item.preco_total || 0)}
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
              {items.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={8} className="text-right font-semibold">Totais:</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{totals.hh.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.preco)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-6 px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted border"></div>
              <span>Campos do catálogo (não editáveis)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/5 border border-primary/20"></div>
              <span>Campos do orçamento (editáveis)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
