import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Trash2, Search } from 'lucide-react';
import { useMaterials, type MaterialFormData } from '@/hooks/orcamentos/useMaterials';
import { useMaterialCatalog, type CatalogItem } from '@/hooks/orcamentos/useMaterialCatalog';
import { SUPPLY_TYPE_CONFIG, type SupplyType } from '@/lib/orcamentos/types';
import { formatCurrency } from '@/lib/currency';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Materiais() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { items, totals, isLoading, createItem, updateItem, deleteItem } = useMaterials(selectedRevision?.id);
  const { searchCatalog } = useMaterialCatalog();
  
  const [newItem, setNewItem] = useState<MaterialFormData>({
    descricao: '',
    unidade: 'pç',
    quantidade: 1,
    hh_unitario: 0,
    fator_dificuldade: 1,
    preco_unit: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddItem = async () => {
    if (!newItem.descricao) return;
    await createItem.mutateAsync(newItem);
    setNewItem({
      descricao: '',
      unidade: 'pç',
      quantidade: 1,
      hh_unitario: 0,
      fator_dificuldade: 1,
      preco_unit: 0,
    });
  };

  const handleUpdateField = async (id: string, field: string, value: string | number) => {
    await updateItem.mutateAsync({ id, [field]: value });
  };

  const handleSearch = async () => {
    if (searchTerm.length < 2) return;
    setIsSearching(true);
    const results = await searchCatalog(searchTerm);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectFromCatalog = (item: CatalogItem) => {
    setNewItem(prev => ({
      ...prev,
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      preco_unit: item.preco_ref ?? 0,
      hh_unitario: item.hh_unit_ref ?? 0,
    }));
    setDialogOpen(false);
    setSearchTerm('');
    setSearchResults([]);
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
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Levantamento de Materiais</CardTitle>
        {!lockState.isLocked && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Buscar na Base
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buscar Material no Catálogo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                {searchResults.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Un</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">HH</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                          <TableCell className="text-xs">{item.descricao}</TableCell>
                          <TableCell className="text-xs">{item.unidade}</TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(item.preco_ref ?? 0)}</TableCell>
                          <TableCell className="text-right text-xs">{item.hh_unit_ref?.toFixed(2) ?? '-'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleSelectFromCatalog(item)}>
                              Usar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
                  <p className="text-center text-muted-foreground py-4">Nenhum material encontrado</p>
                )}
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
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.item_seq}</TableCell>
                  <TableCell>
                    <Input
                      value={item.codigo || ''}
                      onChange={(e) => handleUpdateField(item.id, 'codigo', e.target.value)}
                      disabled={lockState.isLocked}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.descricao}
                      onChange={(e) => handleUpdateField(item.id, 'descricao', e.target.value)}
                      disabled={lockState.isLocked}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.unidade}
                      onChange={(e) => handleUpdateField(item.id, 'unidade', e.target.value)}
                      disabled={lockState.isLocked}
                      className="h-8 text-xs w-14"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => handleUpdateField(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                      disabled={lockState.isLocked}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.fornecimento}
                      onValueChange={(value) => handleUpdateField(item.id, 'fornecimento', value)}
                      disabled={lockState.isLocked}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SUPPLY_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.hh_unitario}
                      onChange={(e) => handleUpdateField(item.id, 'hh_unitario', parseFloat(e.target.value) || 0)}
                      disabled={lockState.isLocked}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={item.fator_dificuldade}
                      onChange={(e) => handleUpdateField(item.id, 'fator_dificuldade', parseFloat(e.target.value) || 1)}
                      disabled={lockState.isLocked}
                      className="h-8 text-xs text-right w-14"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {item.hh_total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.preco_unit}
                      onChange={(e) => handleUpdateField(item.id, 'preco_unit', parseFloat(e.target.value) || 0)}
                      disabled={lockState.isLocked}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(item.preco_total)}
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
              ))}
              
              {/* New item row */}
              {!lockState.isLocked && (
                <TableRow className="bg-muted/30">
                  <TableCell className="text-muted-foreground">+</TableCell>
                  <TableCell>
                    <Input
                      placeholder="Código"
                      value={newItem.codigo || ''}
                      onChange={(e) => setNewItem({ ...newItem, codigo: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Descrição do material"
                      value={newItem.descricao}
                      onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newItem.unidade}
                      onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
                      className="h-8 text-xs w-14"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newItem.quantidade}
                      onChange={(e) => setNewItem({ ...newItem, quantidade: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newItem.fornecimento || 'A_DEFINIR'}
                      onValueChange={(value) => setNewItem({ ...newItem, fornecimento: value as SupplyType })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SUPPLY_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.hh_unitario}
                      onChange={(e) => setNewItem({ ...newItem, hh_unitario: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={newItem.fator_dificuldade}
                      onChange={(e) => setNewItem({ ...newItem, fator_dificuldade: parseFloat(e.target.value) || 1 })}
                      className="h-8 text-xs text-right w-14"
                    />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.preco_unit}
                      onChange={(e) => setNewItem({ ...newItem, preco_unit: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleAddItem}
                      disabled={!newItem.descricao || createItem.isPending}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={8} className="text-right font-semibold">Totais:</TableCell>
                <TableCell className="text-right font-mono font-semibold">{totals.hh.toFixed(2)}</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.preco)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
