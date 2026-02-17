import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, FolderTree, Folder, FileText } from 'lucide-react';
import { useMaterialGroups, MaterialGroup } from '@/hooks/orcamentos/useMaterialGroups';
import { useMaterialCategories, MaterialCategory } from '@/hooks/orcamentos/useMaterialCategories';
import { useMaterialSubcategories, MaterialSubcategory } from '@/hooks/orcamentos/useMaterialSubcategories';
import { useMaterialCatalog } from '@/hooks/orcamentos/useMaterialCatalog';
import { toast } from 'sonner';

type DialogMode = 'create' | 'edit';
type EntityType = 'group' | 'category' | 'subcategory';

interface EntityDialogState {
  open: boolean;
  mode: DialogMode;
  type: EntityType;
  entity?: MaterialGroup | MaterialCategory | MaterialSubcategory;
  parentId?: string;
}

interface DeleteDialogState {
  open: boolean;
  type: EntityType;
  entity?: MaterialGroup | MaterialCategory | MaterialSubcategory;
  hasChildren: boolean;
  hasLinkedMaterials: boolean;
}

export function MaterialHierarchyManager() {
  const { groups, createGroup, updateGroup, deleteGroup, isLoading: loadingGroups } = useMaterialGroups();
  const { allCategories, createCategory, updateCategory, deleteCategory } = useMaterialCategories();
  const { allSubcategories, createSubcategory, updateSubcategory, deleteSubcategory } = useMaterialSubcategories();
  const { items: materials } = useMaterialCatalog();

  const [entityDialog, setEntityDialog] = useState<EntityDialogState>({
    open: false,
    mode: 'create',
    type: 'group',
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    type: 'group',
    hasChildren: false,
    hasLinkedMaterials: false,
  });
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');

  // Get categories for a specific group
  const getCategoriesForGroup = (groupId: string) => 
    allCategories.filter(c => c.group_id === groupId);

  // Get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryId: string) => 
    allSubcategories.filter(s => s.category_id === categoryId);

  // Check if group has categories
  const groupHasCategories = (groupId: string) => 
    allCategories.some(c => c.group_id === groupId);

  // Check if category has subcategories
  const categoryHasSubcategories = (categoryId: string) => 
    allSubcategories.some(s => s.category_id === categoryId);

  // Check if entity has linked materials
  const hasLinkedMaterials = (type: EntityType, id: string) => {
    switch (type) {
      case 'group':
        return materials.some(m => m.group_id === id);
      case 'category':
        return materials.some(m => m.category_id === id);
      case 'subcategory':
        return materials.some(m => m.subcategory_id === id);
      default:
        return false;
    }
  };

  // Open create dialog
  const openCreateDialog = (type: EntityType, parentId?: string) => {
    setFormName('');
    setFormParentId(parentId || '');
    setEntityDialog({
      open: true,
      mode: 'create',
      type,
      parentId,
    });
  };

  // Open edit dialog
  const openEditDialog = (type: EntityType, entity: MaterialGroup | MaterialCategory | MaterialSubcategory) => {
    setFormName(entity.nome);
    if (type === 'category') {
      setFormParentId((entity as MaterialCategory).group_id);
    } else if (type === 'subcategory') {
      setFormParentId((entity as MaterialSubcategory).category_id);
    }
    setEntityDialog({
      open: true,
      mode: 'edit',
      type,
      entity,
    });
  };

  // Open delete dialog
  const openDeleteDialog = (type: EntityType, entity: MaterialGroup | MaterialCategory | MaterialSubcategory) => {
    let hasChildren = false;
    if (type === 'group') {
      hasChildren = groupHasCategories(entity.id);
    } else if (type === 'category') {
      hasChildren = categoryHasSubcategories(entity.id);
    }

    const linked = hasLinkedMaterials(type, entity.id);

    setDeleteDialog({
      open: true,
      type,
      entity,
      hasChildren,
      hasLinkedMaterials: linked,
    });
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const { mode, type, entity } = entityDialog;

    try {
      if (mode === 'create') {
        switch (type) {
          case 'group':
            await createGroup.mutateAsync(formName.trim());
            toast.success('Grupo criado com sucesso');
            break;
          case 'category':
            if (!formParentId) {
              toast.error('Selecione um grupo');
              return;
            }
            await createCategory.mutateAsync({ group_id: formParentId, nome: formName.trim() });
            toast.success('Categoria criada com sucesso');
            break;
          case 'subcategory':
            if (!formParentId) {
              toast.error('Selecione uma categoria');
              return;
            }
            await createSubcategory.mutateAsync({ category_id: formParentId, nome: formName.trim() });
            toast.success('Subcategoria criada com sucesso');
            break;
        }
      } else if (mode === 'edit' && entity) {
        switch (type) {
          case 'group':
            await updateGroup.mutateAsync({ id: entity.id, nome: formName.trim() });
            toast.success('Grupo atualizado');
            break;
          case 'category':
            await updateCategory.mutateAsync({ id: entity.id, nome: formName.trim() });
            toast.success('Categoria atualizada');
            break;
          case 'subcategory':
            await updateSubcategory.mutateAsync({ id: entity.id, nome: formName.trim() });
            toast.success('Subcategoria atualizada');
            break;
        }
      }

      setEntityDialog({ ...entityDialog, open: false });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle delete
  const handleDelete = async () => {
    const { type, entity, hasChildren, hasLinkedMaterials } = deleteDialog;

    if (!entity) return;

    if (hasChildren || hasLinkedMaterials) {
      toast.error('Não é possível excluir: existem itens vinculados');
      setDeleteDialog({ ...deleteDialog, open: false });
      return;
    }

    try {
      switch (type) {
        case 'group':
          await deleteGroup.mutateAsync(entity.id);
          break;
        case 'category':
          await deleteCategory.mutateAsync(entity.id);
          break;
        case 'subcategory':
          await deleteSubcategory.mutateAsync(entity.id);
          break;
      }
      setDeleteDialog({ ...deleteDialog, open: false });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const getEntityLabel = (type: EntityType) => {
    switch (type) {
      case 'group': return 'Grupo';
      case 'category': return 'Categoria';
      case 'subcategory': return 'Subcategoria';
    }
  };

  if (loadingGroups) {
    return <div className="p-4 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openCreateDialog('group')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo Grupo
        </Button>
        <Button onClick={() => openCreateDialog('category')} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Nova Categoria
        </Button>
        <Button onClick={() => openCreateDialog('subcategory')} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Nova Subcategoria
        </Button>
      </div>

      {/* Hierarchy tree */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Estrutura Hierárquica
          </CardTitle>
          <CardDescription>
            {groups.length} grupos, {allCategories.length} categorias, {allSubcategories.length} subcategorias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum grupo cadastrado. Clique em "Novo Grupo" para começar.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {groups.map((group) => {
                const categories = getCategoriesForGroup(group.id);
                const groupMaterialCount = materials.filter(m => m.group_id === group.id).length;

                return (
                  <AccordionItem key={group.id} value={group.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-primary" />
                          <span className="font-medium">{group.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            ({categories.length} cat., {groupMaterialCount} mat.)
                          </span>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditDialog('group', group)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog('group', group)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => openCreateDialog('category', group.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Cat.
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {categories.length === 0 ? (
                        <div className="pl-6 py-2 text-sm text-muted-foreground">
                          Nenhuma categoria neste grupo
                        </div>
                      ) : (
                        <div className="pl-6 space-y-1">
                          {categories.map((category) => {
                            const subcategories = getSubcategoriesForCategory(category.id);
                            const catMaterialCount = materials.filter(m => m.category_id === category.id).length;

                            return (
                              <Accordion key={category.id} type="multiple" className="w-full">
                                <AccordionItem value={category.id} className="border-l-2 border-muted pl-4">
                                  <AccordionTrigger className="hover:no-underline py-2">
                                    <div className="flex items-center justify-between w-full pr-4">
                                      <div className="flex items-center gap-2">
                                        <Folder className="h-4 w-4 text-muted-foreground" />
                                        <span>{category.nome}</span>
                                        <span className="text-xs text-muted-foreground">
                                          ({subcategories.length} subcat., {catMaterialCount} mat.)
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => openEditDialog('category', category)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive hover:text-destructive"
                                          onClick={() => openDeleteDialog('category', category)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => openCreateDialog('subcategory', category.id)}
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Sub.
                                        </Button>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    {subcategories.length === 0 ? (
                                      <div className="pl-6 py-2 text-sm text-muted-foreground">
                                        Nenhuma subcategoria
                                      </div>
                                    ) : (
                                      <div className="pl-6 space-y-1">
                                        {subcategories.map((subcategory) => {
                                          const subMaterialCount = materials.filter(m => m.subcategory_id === subcategory.id).length;

                                          return (
                                            <div
                                              key={subcategory.id}
                                              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 border-l-2 border-muted"
                                            >
                                              <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">{subcategory.nome}</span>
                                                <span className="text-xs text-muted-foreground">
                                                  ({subMaterialCount} mat.)
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6"
                                                  onClick={() => openEditDialog('subcategory', subcategory)}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                                  onClick={() => openDeleteDialog('subcategory', subcategory)}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={entityDialog.open} onOpenChange={(open) => setEntityDialog({ ...entityDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entityDialog.mode === 'create' ? 'Criar' : 'Editar'} {getEntityLabel(entityDialog.type)}
            </DialogTitle>
            <DialogDescription>
              {entityDialog.mode === 'create'
                ? `Preencha os dados para criar ${entityDialog.type === 'group' ? 'um novo grupo' : entityDialog.type === 'category' ? 'uma nova categoria' : 'uma nova subcategoria'}.`
                : 'Atualize os dados abaixo.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Parent selector for category */}
            {entityDialog.type === 'category' && entityDialog.mode === 'create' && (
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={formParentId || '__select__'} onValueChange={setFormParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__select__" disabled>Selecione...</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parent selector for subcategory */}
            {entityDialog.type === 'subcategory' && entityDialog.mode === 'create' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formParentId || '__select__'} onValueChange={setFormParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__select__" disabled>Selecione...</SelectItem>
                    {groups.map(g => {
                      const cats = getCategoriesForGroup(g.id);
                      if (cats.length === 0) return null;
                      return (
                        <div key={g.id}>
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium">{g.nome}</div>
                          {cats.map(c => (
                            <SelectItem key={c.id} value={c.id} className="pl-4">
                              {c.nome}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={`Nome ${entityDialog.type === 'group' ? 'do grupo' : entityDialog.type === 'category' ? 'da categoria' : 'da subcategoria'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntityDialog({ ...entityDialog, open: false })}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {entityDialog.mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {getEntityLabel(deleteDialog.type)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.hasChildren || deleteDialog.hasLinkedMaterials ? (
                <span className="text-destructive">
                  Não é possível excluir "{deleteDialog.entity?.nome}" pois existem{' '}
                  {deleteDialog.hasChildren ? 'itens filhos' : 'materiais vinculados'}.
                  {deleteDialog.hasChildren && ' Remova os itens filhos primeiro.'}
                  {deleteDialog.hasLinkedMaterials && ' Desvincule os materiais primeiro.'}
                </span>
              ) : (
                <>
                  Tem certeza que deseja excluir "{deleteDialog.entity?.nome}"?
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!deleteDialog.hasChildren && !deleteDialog.hasLinkedMaterials && (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
