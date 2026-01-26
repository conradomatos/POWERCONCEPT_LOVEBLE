import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Calculator, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTaxRulesCatalog, TaxRuleSet, TaxRuleItem } from '@/hooks/orcamentos/useTaxRulesCatalog';

const BASE_LABELS: Record<string, string> = {
  SALE: 'Preço de Venda',
  COST: 'Custo',
};

const ESCOPO_LABELS: Record<string, string> = {
  ALL: 'Todos',
  MATERIALS: 'Materiais',
  SERVICES: 'Serviços',
};

export default function CatalogoImpostos() {
  const { sets, isLoading, createSet, updateSet, deleteSet, createItem, updateItem, deleteItem } = useTaxRulesCatalog();
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [showNewSetDialog, setShowNewSetDialog] = useState(false);
  const [editingSet, setEditingSet] = useState<TaxRuleSet | null>(null);
  const [newSetData, setNewSetData] = useState({ nome: '', descricao: '' });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedSets);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSets(newExpanded);
  };

  const handleCreateSet = async () => {
    await createSet.mutateAsync(newSetData);
    setShowNewSetDialog(false);
    setNewSetData({ nome: '', descricao: '' });
  };

  const handleUpdateSet = async () => {
    if (!editingSet) return;
    await updateSet.mutateAsync({ id: editingSet.id, nome: newSetData.nome, descricao: newSetData.descricao });
    setEditingSet(null);
    setNewSetData({ nome: '', descricao: '' });
  };

  const handleAddItem = async (setId: string) => {
    const set = sets.find(s => s.id === setId);
    const nextOrder = (set?.items?.length || 0) + 1;
    await createItem.mutateAsync({
      set_id: setId,
      nome: 'Novo Imposto',
      sigla: 'NI',
      tipo_valor: 'PERCENT',
      valor: 0,
      base: 'SALE',
      escopo: 'ALL',
      ordem: nextOrder,
    });
    setExpandedSets(new Set([...expandedSets, setId]));
  };

  const handleUpdateItem = async (item: TaxRuleItem, field: keyof TaxRuleItem, value: any) => {
    await updateItem.mutateAsync({ id: item.id, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-red-500" />
            Catálogo de Impostos
          </h1>
          <p className="text-muted-foreground">
            Conjuntos de impostos reutilizáveis para orçamentos
          </p>
        </div>
        <Button onClick={() => setShowNewSetDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Conjunto
        </Button>
      </div>

      {sets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum conjunto de impostos</h3>
            <p className="text-muted-foreground mb-4">
              Crie conjuntos padrão de impostos para aplicar em seus orçamentos
            </p>
            <Button onClick={() => setShowNewSetDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro conjunto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sets.map((set) => (
            <Collapsible 
              key={set.id} 
              open={expandedSets.has(set.id)}
              onOpenChange={() => toggleExpand(set.id)}
            >
              <Card>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-3 text-left hover:opacity-80">
                        {expandedSets.has(set.id) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{set.nome}</CardTitle>
                          {set.descricao && (
                            <CardDescription className="mt-1">{set.descricao}</CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {set.items?.length || 0} impostos
                        </Badge>
                      </button>
                    </CollapsibleTrigger>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSet(set);
                          setNewSetData({ nome: set.nome, descricao: set.descricao || '' });
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(set.id);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir conjunto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá remover o conjunto "{set.nome}" e todos os seus impostos. Isso não pode ser desfeito.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSet.mutate(set.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {set.items && set.items.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Sigla</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Base</TableHead>
                            <TableHead>Escopo</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {set.items.map((item, idx) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell>
                                <Input
                                  value={item.sigla}
                                  onChange={(e) => handleUpdateItem(item, 'sigla', e.target.value)}
                                  className="w-20 h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.nome}
                                  onChange={(e) => handleUpdateItem(item, 'nome', e.target.value)}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.tipo_valor}
                                  onValueChange={(v) => handleUpdateItem(item, 'tipo_valor', v)}
                                >
                                  <SelectTrigger className="w-24 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PERCENT">%</SelectItem>
                                    <SelectItem value="FIXED">R$</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.valor}
                                  onChange={(e) => handleUpdateItem(item, 'valor', parseFloat(e.target.value) || 0)}
                                  className="w-24 h-8 text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.base}
                                  onValueChange={(v) => handleUpdateItem(item, 'base', v)}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SALE">{BASE_LABELS.SALE}</SelectItem>
                                    <SelectItem value="COST">{BASE_LABELS.COST}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.escopo}
                                  onValueChange={(v) => handleUpdateItem(item, 'escopo', v)}
                                >
                                  <SelectTrigger className="w-28 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ALL">{ESCOPO_LABELS.ALL}</SelectItem>
                                    <SelectItem value="MATERIALS">{ESCOPO_LABELS.MATERIALS}</SelectItem>
                                    <SelectItem value="SERVICES">{ESCOPO_LABELS.SERVICES}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir imposto?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remover "{item.nome}" deste conjunto?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteItem.mutate(item.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>Nenhum imposto neste conjunto</p>
                        <Button
                          variant="link"
                          onClick={() => handleAddItem(set.id)}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar imposto
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* New Set Dialog */}
      <Dialog open={showNewSetDialog} onOpenChange={setShowNewSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Conjunto de Impostos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={newSetData.nome}
                onChange={(e) => setNewSetData({ ...newSetData, nome: e.target.value })}
                placeholder="Ex: Impostos Padrão SP"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={newSetData.descricao}
                onChange={(e) => setNewSetData({ ...newSetData, descricao: e.target.value })}
                placeholder="Descrição do conjunto..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSetDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSet} disabled={!newSetData.nome.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Set Dialog */}
      <Dialog open={!!editingSet} onOpenChange={(open) => !open && setEditingSet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conjunto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={newSetData.nome}
                onChange={(e) => setNewSetData({ ...newSetData, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-descricao">Descrição (opcional)</Label>
              <Textarea
                id="edit-descricao"
                value={newSetData.descricao}
                onChange={(e) => setNewSetData({ ...newSetData, descricao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSet(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSet} disabled={!newSetData.nome.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
