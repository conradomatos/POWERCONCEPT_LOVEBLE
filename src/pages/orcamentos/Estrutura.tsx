import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWbs } from '@/hooks/orcamentos/useWbs';
import { Plus, Pencil, Trash2, Layers, FolderOpen, ListTodo, ChevronRight, ChevronDown } from 'lucide-react';
import { WBS_TYPE_CONFIG, type WbsType, type BudgetWbs } from '@/lib/orcamentos/types';
import type { BudgetRevision } from '@/lib/orcamentos/types';

interface OutletContextType {
  budget: any;
  selectedRevision: BudgetRevision | undefined;
  lockState: { isLocked: boolean };
}

interface WbsItemProps {
  item: BudgetWbs;
  level: number;
  onEdit: (item: BudgetWbs) => void;
  onDelete: (id: string) => void;
  isLocked: boolean;
}

function WbsItem({ item, level, onEdit, onDelete, isLocked }: WbsItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  const typeIcons: Record<WbsType, typeof Layers> = {
    CHAPTER: FolderOpen,
    PACKAGE: Layers,
    ACTIVITY: ListTodo,
  };
  const Icon = typeIcons[item.tipo];

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} className="p-0.5 hover:bg-muted rounded">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">{item.code}</span>
          </div>
        </TableCell>
        <TableCell>{item.nome}</TableCell>
        <TableCell>
          <span className="text-xs px-2 py-1 rounded-full bg-muted">
            {WBS_TYPE_CONFIG[item.tipo].label}
          </span>
        </TableCell>
        <TableCell className="text-right">
          {!isLocked && (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>
      {expanded && hasChildren && item.children?.map((child) => (
        <WbsItem key={child.id} item={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} isLocked={isLocked} />
      ))}
    </>
  );
}

export default function Estrutura() {
  const context = useOutletContext<OutletContextType>();
  const { selectedRevision, lockState } = context || {};
  
  const { items, tree, isLoading, createItem, updateItem, deleteItem } = useWbs(selectedRevision?.id);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetWbs | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    nome: '',
    tipo: 'PACKAGE' as WbsType,
    parent_id: '' as string | null,
  });

  const resetForm = () => {
    setFormData({ code: '', nome: '', tipo: 'PACKAGE', parent_id: null });
    setEditingItem(null);
  };

  const handleOpenCreate = (parentId?: string) => {
    resetForm();
    if (parentId) {
      setFormData((prev) => ({ ...prev, parent_id: parentId }));
    }
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: BudgetWbs) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      nome: item.nome,
      tipo: item.tipo,
      parent_id: item.parent_id || null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createItem.mutateAsync(formData);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este item? Itens filhos também serão excluídos.')) {
      await deleteItem.mutateAsync(id);
    }
  };

  // Get chapters for parent selection
  const chapters = items.filter((i) => i.tipo === 'CHAPTER');
  const packages = items.filter((i) => i.tipo === 'PACKAGE');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Estrutura WBS
          </CardTitle>
          <CardDescription>
            Organize o orçamento em capítulos, pacotes e atividades
          </CardDescription>
        </div>
        {!lockState?.isLocked && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenCreate()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Item WBS' : 'Novo Item WBS'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                      placeholder="1.2.3"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v) => setFormData((p) => ({ ...p, tipo: v as WbsType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHAPTER">Capítulo</SelectItem>
                        <SelectItem value="PACKAGE">Pacote</SelectItem>
                        <SelectItem value="ACTIVITY">Atividade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome do item"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Item Pai (opcional)</Label>
                  <Select
                    value={formData.parent_id || 'none'}
                    onValueChange={(v) => setFormData((p) => ({ ...p, parent_id: v === 'none' ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (item raiz)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (item raiz)</SelectItem>
                      {[...chapters, ...packages].map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} - {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                    {editingItem ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : tree.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum item WBS cadastrado</p>
            <p className="text-sm text-muted-foreground">Crie capítulos e pacotes para organizar o orçamento</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[120px]">Tipo</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.map((item) => (
                <WbsItem
                  key={item.id}
                  item={item}
                  level={0}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  isLocked={lockState?.isLocked || false}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
