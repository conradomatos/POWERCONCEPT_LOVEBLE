import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Cog, Pencil } from 'lucide-react';
import { useLaborParamCatalog, type LaborParamCatalogFormData } from '@/hooks/orcamentos/useLaborParamCatalog';

export default function CatalogoMaoDeObraParametros() {
  const { params, isLoading, createParam, updateParam, deleteParam } = useLaborParamCatalog();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LaborParamCatalogFormData>({
    nome: '',
    encargos_pct_ref: 80,
    he50_pct_ref: 50,
    he100_pct_ref: 100,
    periculosidade_pct_ref: 30,
    insalubridade_pct_ref: 0,
    adicional_noturno_pct_ref: 20,
    improdutividade_pct_ref: 0,
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      encargos_pct_ref: 80,
      he50_pct_ref: 50,
      he100_pct_ref: 100,
      periculosidade_pct_ref: 30,
      insalubridade_pct_ref: 0,
      adicional_noturno_pct_ref: 20,
      improdutividade_pct_ref: 0,
    });
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (param: typeof params[0]) => {
    setEditingId(param.id);
    setFormData({
      nome: param.nome,
      encargos_pct_ref: param.encargos_pct_ref,
      he50_pct_ref: param.he50_pct_ref,
      he100_pct_ref: param.he100_pct_ref,
      periculosidade_pct_ref: param.periculosidade_pct_ref,
      insalubridade_pct_ref: param.insalubridade_pct_ref,
      adicional_noturno_pct_ref: param.adicional_noturno_pct_ref,
      improdutividade_pct_ref: param.improdutividade_pct_ref,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome) return;
    
    if (editingId) {
      await updateParam.mutateAsync({ id: editingId, ...formData });
    } else {
      await createParam.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cog className="h-6 w-6" />
            Parâmetros de Mão de Obra
          </h1>
          <p className="text-muted-foreground">
            Conjuntos de encargos e adicionais reutilizáveis
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Conjunto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Conjunto' : 'Novo Conjunto de Parâmetros'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Conjunto</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Padrão Industrial"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Encargos (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.encargos_pct_ref}
                    onChange={(e) => setFormData({ ...formData, encargos_pct_ref: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HE 50% (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.he50_pct_ref}
                    onChange={(e) => setFormData({ ...formData, he50_pct_ref: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HE 100% (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.he100_pct_ref}
                    onChange={(e) => setFormData({ ...formData, he100_pct_ref: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Periculosidade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.periculosidade_pct_ref}
                    onChange={(e) => setFormData({ ...formData, periculosidade_pct_ref: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Insalubridade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.insalubridade_pct_ref}
                    onChange={(e) => setFormData({ ...formData, insalubridade_pct_ref: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adic. Noturno (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.adicional_noturno_pct_ref}
                    onChange={(e) => setFormData({ ...formData, adicional_noturno_pct_ref: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Improdutividade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.improdutividade_pct_ref}
                    onChange={(e) => setFormData({ ...formData, improdutividade_pct_ref: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.nome || createParam.isPending || updateParam.isPending}>
                  {editingId ? 'Salvar' : 'Criar Conjunto'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conjuntos de Parâmetros</CardTitle>
            <CardDescription>
              Estes conjuntos podem ser aplicados em qualquer orçamento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Encargos</TableHead>
                    <TableHead className="text-right">HE 50%</TableHead>
                    <TableHead className="text-right">HE 100%</TableHead>
                    <TableHead className="text-right">Periculosidade</TableHead>
                    <TableHead className="text-right">Insalubridade</TableHead>
                    <TableHead className="text-right">Ad. Noturno</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : params.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum conjunto cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    params.map((param) => (
                      <TableRow key={param.id}>
                        <TableCell className="font-medium">{param.nome}</TableCell>
                        <TableCell className="text-right">{param.encargos_pct_ref}%</TableCell>
                        <TableCell className="text-right">{param.he50_pct_ref}%</TableCell>
                        <TableCell className="text-right">{param.he100_pct_ref}%</TableCell>
                        <TableCell className="text-right">{param.periculosidade_pct_ref}%</TableCell>
                        <TableCell className="text-right">{param.insalubridade_pct_ref}%</TableCell>
                        <TableCell className="text-right">{param.adicional_noturno_pct_ref}%</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(param)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteParam.mutate(param.id)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
