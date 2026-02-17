import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Layers, FolderOpen, ListTodo } from 'lucide-react';
import { useWbsTemplates, type WbsTemplateFormData, type WbsTemplateItemFormData } from '@/hooks/orcamentos/useWbsTemplates';

export default function WbsTemplates() {
  const { 
    templates, 
    isLoading, 
    createTemplate, 
    deleteTemplate,
    createTemplateItem,
    deleteTemplateItem,
  } = useWbsTemplates();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<WbsTemplateFormData>({ nome: '', descricao: '' });
  
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Omit<WbsTemplateItemFormData, 'template_id'>>({
    code: '',
    nome: '',
    tipo: 'PACKAGE',
    parent_code: null,
  });

  const handleCreateTemplate = async () => {
    if (!newTemplate.nome) return;
    await createTemplate.mutateAsync(newTemplate);
    setNewTemplate({ nome: '', descricao: '' });
    setDialogOpen(false);
  };

  const handleAddItem = async () => {
    if (!selectedTemplateId || !newItem.code || !newItem.nome) return;
    await createTemplateItem.mutateAsync({
      template_id: selectedTemplateId,
      ...newItem,
    });
    setNewItem({ code: '', nome: '', tipo: 'PACKAGE', parent_code: null });
    setItemDialogOpen(false);
  };

  const openAddItemDialog = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setItemDialogOpen(true);
  };

  const typeIcons: Record<string, typeof Layers> = {
    CHAPTER: FolderOpen,
    PACKAGE: Layers,
    ACTIVITY: ListTodo,
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Templates WBS
          </h1>
          <p className="text-muted-foreground">
            Estruturas de projeto reutilizáveis
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Template WBS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={newTemplate.nome}
                  onChange={(e) => setNewTemplate({ ...newTemplate, nome: e.target.value })}
                  placeholder="Ex: Subestação 138kV"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={newTemplate.descricao || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, descricao: e.target.value })}
                  placeholder="Descrição do template..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTemplate} disabled={!newTemplate.nome || createTemplate.isPending}>
                  Criar Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

        {/* Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Item ao Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={newItem.code}
                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                    placeholder="1.2.3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newItem.tipo}
                    onValueChange={(v) => setNewItem({ ...newItem, tipo: v as 'CHAPTER' | 'PACKAGE' | 'ACTIVITY' })}
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
                  value={newItem.nome}
                  onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                  placeholder="Nome do item"
                />
              </div>
              <div className="space-y-2">
                <Label>Código do Item Pai (opcional)</Label>
                <Input
                  value={newItem.parent_code || ''}
                  onChange={(e) => setNewItem({ ...newItem, parent_code: e.target.value || null })}
                  placeholder="Ex: 1.2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddItem} disabled={!newItem.code || !newItem.nome || createTemplateItem.isPending}>
                  Adicionar Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum template cadastrado</p>
              <p className="text-sm text-muted-foreground">Crie um template para reutilizar em múltiplos orçamentos</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {templates.map((template) => (
              <AccordionItem key={template.id} value={template.id} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{template.nome}</span>
                      {template.descricao && (
                        <span className="text-sm text-muted-foreground">{template.descricao}</span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {template.items?.length || 0} itens
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Itens do Template</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openAddItemDialog(template.id)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Item
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('Excluir este template e todos os seus itens?')) {
                              deleteTemplate.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {template.items && template.items.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-32">Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead className="w-28">Tipo</TableHead>
                            <TableHead className="w-28">Pai</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {template.items
                            .sort((a, b) => a.ordem - b.ordem)
                            .map((item) => {
                              const Icon = typeIcons[item.tipo] || Layers;
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                                  <TableCell className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    {item.nome}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                                      {item.tipo === 'CHAPTER' ? 'Capítulo' : item.tipo === 'PACKAGE' ? 'Pacote' : 'Atividade'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm text-muted-foreground">
                                    {item.parent_code || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteTemplateItem.mutate(item.id)}
                                      className="h-8 w-8"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum item neste template
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
    </div>
  );
}
