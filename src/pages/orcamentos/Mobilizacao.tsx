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
import { Plus, Trash2 } from 'lucide-react';
import { useMobilization, type MobilizationFormData } from '@/hooks/orcamentos/useMobilization';
import { formatCurrency } from '@/lib/currency';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Mobilizacao() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { items, total, isLoading, createItem, updateItem, deleteItem } = useMobilization(selectedRevision?.id);

  const [newItem, setNewItem] = useState<MobilizationFormData>({
    descricao: '',
    unidade: 'vb',
    quantidade: 1,
    valor_unitario: 0,
  });

  const handleAddItem = async () => {
    if (!newItem.descricao) return;
    await createItem.mutateAsync(newItem);
    setNewItem({
      descricao: '',
      unidade: 'vb',
      quantidade: 1,
      valor_unitario: 0,
    });
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Mobilização e Desmobilização</CardTitle>
        <CardDescription>Itens de custo para mobilização de equipe e equipamentos</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px]">Descrição</TableHead>
              <TableHead className="w-20">Unidade</TableHead>
              <TableHead className="w-24 text-right">Quantidade</TableHead>
              <TableHead className="w-32 text-right">Valor Unitário</TableHead>
              <TableHead className="w-32 text-right">Total</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    value={item.descricao}
                    onChange={(e) => updateItem.mutate({ id: item.id, descricao: e.target.value })}
                    disabled={lockState.isLocked}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.unidade || ''}
                    onChange={(e) => updateItem.mutate({ id: item.id, unidade: e.target.value })}
                    disabled={lockState.isLocked}
                    className="h-8 w-16"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.quantidade}
                    onChange={(e) => updateItem.mutate({ id: item.id, quantidade: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.valor_unitario}
                    onChange={(e) => updateItem.mutate({ id: item.id, valor_unitario: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.total)}
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
            
            {!lockState.isLocked && (
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input
                    placeholder="Descrição do item"
                    value={newItem.descricao}
                    onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newItem.unidade}
                    onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
                    className="h-8 w-16"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.quantidade}
                    onChange={(e) => setNewItem({ ...newItem, quantidade: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.valor_unitario}
                    onChange={(e) => setNewItem({ ...newItem, valor_unitario: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-right"
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
        </Table>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex justify-end w-full">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Mobilização</p>
            <p className="text-2xl font-bold font-mono">{formatCurrency(total)}</p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
