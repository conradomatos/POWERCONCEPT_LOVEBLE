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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useEngineeringItems, type EngineeringFormData } from '@/hooks/orcamentos/useEngineeringItems';
import { useLaborRoles } from '@/hooks/orcamentos/useLaborRoles';
import { formatCurrency } from '@/lib/currency';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Engenharia() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { items, total, isLoading, createItem, updateItem, deleteItem } = useEngineeringItems(selectedRevision?.id);
  const { roles } = useLaborRoles(selectedRevision?.id);

  const [newItem, setNewItem] = useState<EngineeringFormData>({
    descricao: '',
    tipo: 'FECHADO',
    hh: 0,
    valor: 0,
  });

  const handleAddItem = async () => {
    if (!newItem.descricao) return;
    await createItem.mutateAsync(newItem);
    setNewItem({
      descricao: '',
      tipo: 'FECHADO',
      hh: 0,
      valor: 0,
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
        <CardTitle className="text-lg">Projetos de Engenharia</CardTitle>
        <CardDescription>Custos de engenharia por HH ou valor fechado</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px]">Descrição</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="w-36">Função (HH)</TableHead>
              <TableHead className="w-24 text-right">HH</TableHead>
              <TableHead className="w-32 text-right">Valor</TableHead>
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
                  <Select
                    value={item.tipo}
                    onValueChange={(value) => updateItem.mutate({ id: item.id, tipo: value as 'HH' | 'FECHADO' })}
                    disabled={lockState.isLocked}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HH">Por HH</SelectItem>
                      <SelectItem value="FECHADO">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {item.tipo === 'HH' ? (
                    <Select
                      value={item.labor_role_id || ''}
                      onValueChange={(value) => updateItem.mutate({ id: item.id, labor_role_id: value })}
                      disabled={lockState.isLocked}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.funcao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.tipo === 'HH' ? (
                    <Input
                      type="number"
                      value={item.hh || 0}
                      onChange={(e) => updateItem.mutate({ id: item.id, hh: parseFloat(e.target.value) || 0 })}
                      disabled={lockState.isLocked}
                      className="h-8 text-right"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.tipo === 'FECHADO' ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={item.valor || 0}
                      onChange={(e) => updateItem.mutate({ id: item.id, valor: parseFloat(e.target.value) || 0 })}
                      disabled={lockState.isLocked}
                      className="h-8 text-right"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
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
                    placeholder="Ex: Projeto elétrico, Memorial de cálculo..."
                    value={newItem.descricao}
                    onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newItem.tipo}
                    onValueChange={(value) => setNewItem({ ...newItem, tipo: value as 'HH' | 'FECHADO' })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HH">Por HH</SelectItem>
                      <SelectItem value="FECHADO">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {newItem.tipo === 'HH' && (
                    <Select
                      value={newItem.labor_role_id || ''}
                      onValueChange={(value) => setNewItem({ ...newItem, labor_role_id: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.funcao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  {newItem.tipo === 'HH' && (
                    <Input
                      type="number"
                      placeholder="0"
                      value={newItem.hh || ''}
                      onChange={(e) => setNewItem({ ...newItem, hh: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-right"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {newItem.tipo === 'FECHADO' && (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newItem.valor || ''}
                      onChange={(e) => setNewItem({ ...newItem, valor: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-right"
                    />
                  )}
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
            <p className="text-sm text-muted-foreground">Total Engenharia</p>
            <p className="text-2xl font-bold font-mono">{formatCurrency(total)}</p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
