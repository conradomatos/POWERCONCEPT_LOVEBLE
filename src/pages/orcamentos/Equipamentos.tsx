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
import { useEquipmentRentals, type EquipmentRentalFormData } from '@/hooks/orcamentos/useEquipmentRentals';
import { formatCurrency } from '@/lib/currency';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Equipamentos() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { items, total, isLoading, createItem, updateItem, deleteItem } = useEquipmentRentals(selectedRevision?.id);

  const [newItem, setNewItem] = useState<EquipmentRentalFormData>({
    descricao: '',
    quantidade: 1,
    valor_mensal: 0,
    meses: 1,
  });

  const handleAddItem = async () => {
    if (!newItem.descricao) return;
    await createItem.mutateAsync(newItem);
    setNewItem({
      descricao: '',
      quantidade: 1,
      valor_mensal: 0,
      meses: 1,
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
        <CardTitle className="text-lg">Locação de Equipamentos</CardTitle>
        <CardDescription>Equipamentos alugados para o projeto</CardDescription>
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
                    type="number"
                    value={item.quantidade}
                    onChange={(e) => updateItem.mutate({ id: item.id, quantidade: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                    className="h-8 text-right w-16"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.valor_mensal}
                    onChange={(e) => updateItem.mutate({ id: item.id, valor_mensal: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.meses}
                    onChange={(e) => updateItem.mutate({ id: item.id, meses: parseInt(e.target.value) || 1 })}
                    disabled={lockState.isLocked}
                    className="h-8 text-right w-16"
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
                    placeholder="Ex: Plataforma elevatória, Caminhão Munck..."
                    value={newItem.descricao}
                    onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.quantidade}
                    onChange={(e) => setNewItem({ ...newItem, quantidade: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-right w-16"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newItem.valor_mensal || ''}
                    onChange={(e) => setNewItem({ ...newItem, valor_mensal: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.meses}
                    onChange={(e) => setNewItem({ ...newItem, meses: parseInt(e.target.value) || 1 })}
                    className="h-8 text-right w-16"
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
            <p className="text-sm text-muted-foreground">Total Equipamentos</p>
            <p className="text-2xl font-bold font-mono">{formatCurrency(total)}</p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
