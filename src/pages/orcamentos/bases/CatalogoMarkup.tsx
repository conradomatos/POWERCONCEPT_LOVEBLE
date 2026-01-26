import { useState } from 'react';
import { Plus, Trash2, Percent, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useMarkupRulesCatalog, MarkupRuleSet } from '@/hooks/orcamentos/useMarkupRulesCatalog';

export default function CatalogoMarkup() {
  const { sets, isLoading, createSet, updateSet, deleteSet, upsertItem } = useMarkupRulesCatalog();
  const [showNewSetDialog, setShowNewSetDialog] = useState(false);
  const [editingSet, setEditingSet] = useState<MarkupRuleSet | null>(null);
  const [newSetData, setNewSetData] = useState({ nome: '', descricao: '' });

  const handleCreateSet = async () => {
    const result = await createSet.mutateAsync(newSetData);
    // Create default markup item for the new set
    await upsertItem.mutateAsync({ set_id: result.id, markup_pct: 0, allow_per_wbs: false });
    setShowNewSetDialog(false);
    setNewSetData({ nome: '', descricao: '' });
  };

  const handleUpdateSet = async () => {
    if (!editingSet) return;
    await updateSet.mutateAsync({ id: editingSet.id, nome: newSetData.nome, descricao: newSetData.descricao });
    setEditingSet(null);
    setNewSetData({ nome: '', descricao: '' });
  };

  const handleUpdateMarkup = async (setId: string, markup_pct: number) => {
    const set = sets.find(s => s.id === setId);
    const item = set?.items?.[0];
    await upsertItem.mutateAsync({ 
      set_id: setId, 
      markup_pct,
      allow_per_wbs: item?.allow_per_wbs ?? false
    });
  };

  const handleTogglePerWbs = async (setId: string, allow_per_wbs: boolean) => {
    const set = sets.find(s => s.id === setId);
    const item = set?.items?.[0];
    await upsertItem.mutateAsync({ 
      set_id: setId, 
      markup_pct: item?.markup_pct ?? 0,
      allow_per_wbs
    });
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
            <Percent className="h-6 w-6 text-teal-500" />
            Catálogo de Markup
          </h1>
          <p className="text-muted-foreground">
            Templates de markup/BDI reutilizáveis para orçamentos
          </p>
        </div>
        <Button onClick={() => setShowNewSetDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {sets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Percent className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum template de markup</h3>
            <p className="text-muted-foreground mb-4">
              Crie templates padrão de markup para aplicar em seus orçamentos
            </p>
            <Button onClick={() => setShowNewSetDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Templates de Markup</CardTitle>
            <CardDescription>
              Defina percentuais de markup/BDI padrão para aplicar em orçamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right w-32">Markup %</TableHead>
                  <TableHead className="text-center w-40">Permite por WBS</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sets.map((set) => {
                  const item = set.items?.[0];
                  return (
                    <TableRow key={set.id}>
                      <TableCell className="font-medium">{set.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {set.descricao || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={item?.markup_pct ?? 0}
                            onChange={(e) => handleUpdateMarkup(set.id, parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-right"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={item?.allow_per_wbs ?? false}
                          onCheckedChange={(checked) => handleTogglePerWbs(set.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSet(set);
                              setNewSetData({ nome: set.nome, descricao: set.descricao || '' });
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá remover o template "{set.nome}". Isso não pode ser desfeito.
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Percent className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Como funciona o Markup</p>
              <p className="text-muted-foreground">
                O markup é aplicado sobre o custo total do orçamento para formar o preço de venda. 
                Quando "Permite por WBS" está ativo, o markup pode ser diferenciado por capítulo/pacote da estrutura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Template Dialog */}
      <Dialog open={showNewSetDialog} onOpenChange={setShowNewSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Template de Markup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={newSetData.nome}
                onChange={(e) => setNewSetData({ ...newSetData, nome: e.target.value })}
                placeholder="Ex: Markup Padrão"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={newSetData.descricao}
                onChange={(e) => setNewSetData({ ...newSetData, descricao: e.target.value })}
                placeholder="Descrição do template..."
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

      {/* Edit Template Dialog */}
      <Dialog open={!!editingSet} onOpenChange={(open) => !open && setEditingSet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
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
