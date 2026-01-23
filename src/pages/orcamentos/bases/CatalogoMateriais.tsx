import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Package } from 'lucide-react';
import { useMaterialCatalog, type CatalogFormData } from '@/hooks/orcamentos/useMaterialCatalog';

export default function CatalogoMateriais() {
  const { items, isLoading, createItem, updateItem, deleteItem } = useMaterialCatalog();

  const [newItem, setNewItem] = useState<CatalogFormData>({
    codigo: '',
    descricao: '',
    unidade: 'pç',
    preco_ref: null,
    hh_unit_ref: null,
    categoria: null,
  });

  const handleAddItem = async () => {
    if (!newItem.codigo || !newItem.descricao) return;
    await createItem.mutateAsync(newItem);
    setNewItem({ codigo: '', descricao: '', unidade: 'pç', preco_ref: null, hh_unit_ref: null, categoria: null });
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Catálogo de Materiais
        </h1>
        <p className="text-muted-foreground">
          Base global de materiais com preços e HH de referência
        </p>
      </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Materiais Cadastrados</CardTitle>
            <CardDescription>
              Estes materiais podem ser utilizados em qualquer orçamento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Código</TableHead>
                    <TableHead className="min-w-[200px]">Descrição</TableHead>
                    <TableHead className="w-16">Un</TableHead>
                    <TableHead className="w-28 text-right">Preço Ref</TableHead>
                    <TableHead className="w-24 text-right">HH Ref</TableHead>
                    <TableHead className="w-28">Categoria</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum material cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.codigo}
                            onChange={(e) => updateItem.mutate({ id: item.id, codigo: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.descricao}
                            onChange={(e) => updateItem.mutate({ id: item.id, descricao: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unidade}
                            onChange={(e) => updateItem.mutate({ id: item.id, unidade: e.target.value })}
                            className="h-8 text-xs w-14"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.preco_ref ?? ''}
                            onChange={(e) => updateItem.mutate({ id: item.id, preco_ref: parseFloat(e.target.value) || null })}
                            className="h-8 text-xs text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.hh_unit_ref ?? ''}
                            onChange={(e) => updateItem.mutate({ id: item.id, hh_unit_ref: parseFloat(e.target.value) || null })}
                            className="h-8 text-xs text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.categoria ?? ''}
                            onChange={(e) => updateItem.mutate({ id: item.id, categoria: e.target.value || null })}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteItem.mutate(item.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  
                  {/* New item row */}
                  <TableRow className="bg-muted/30">
                    <TableCell>
                      <Input
                        placeholder="Código"
                        value={newItem.codigo}
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
                        step="0.01"
                        placeholder="0,00"
                        value={newItem.preco_ref ?? ''}
                        onChange={(e) => setNewItem({ ...newItem, preco_ref: parseFloat(e.target.value) || null })}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={newItem.hh_unit_ref ?? ''}
                        onChange={(e) => setNewItem({ ...newItem, hh_unit_ref: parseFloat(e.target.value) || null })}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Categoria"
                        value={newItem.categoria ?? ''}
                        onChange={(e) => setNewItem({ ...newItem, categoria: e.target.value || null })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleAddItem}
                        disabled={!newItem.codigo || !newItem.descricao || createItem.isPending}
                        className="h-8 w-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
