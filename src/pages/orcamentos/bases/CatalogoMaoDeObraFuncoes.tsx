import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, HardHat, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLaborRoleCatalog, type LaborRoleCatalogFormData } from '@/hooks/orcamentos/useLaborRoleCatalog';
import { formatCurrency } from '@/lib/currency';

export default function CatalogoMaoDeObraFuncoes() {
  const { roles, isLoading, createRole, updateRole, deleteRole } = useLaborRoleCatalog();

  const [newRole, setNewRole] = useState<LaborRoleCatalogFormData>({
    funcao: '',
    salario_base_ref: 0,
    carga_horaria_ref: 220,
    modalidade: 'CLT',
  });

  const handleAddRole = async () => {
    if (!newRole.funcao) return;
    await createRole.mutateAsync(newRole);
    setNewRole({ funcao: '', salario_base_ref: 0, carga_horaria_ref: 220, modalidade: 'CLT' });
  };

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/orcamentos/bases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HardHat className="h-6 w-6" />
              Catálogo de Funções
            </h1>
            <p className="text-muted-foreground">
              Base global de funções de mão de obra e salários de referência
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Funções Cadastradas</CardTitle>
            <CardDescription>
              Estas funções podem ser importadas para qualquer orçamento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Função</TableHead>
                    <TableHead className="w-32 text-right">Salário Base</TableHead>
                    <TableHead className="w-28 text-right">Carga Horária</TableHead>
                    <TableHead className="w-28">Modalidade</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma função cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <Input
                            value={role.funcao}
                            onChange={(e) => updateRole.mutate({ id: role.id, funcao: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={role.salario_base_ref}
                            onChange={(e) => updateRole.mutate({ id: role.id, salario_base_ref: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={role.carga_horaria_ref}
                            onChange={(e) => updateRole.mutate({ id: role.id, carga_horaria_ref: parseFloat(e.target.value) || 220 })}
                            className="h-8 text-right w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={role.modalidade}
                            onValueChange={(value) => updateRole.mutate({ id: role.id, modalidade: value as 'CLT' | 'PACOTE' })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLT">CLT</SelectItem>
                              <SelectItem value="PACOTE">Pacote</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRole.mutate(role.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  
                  {/* New role row */}
                  <TableRow className="bg-muted/30">
                    <TableCell>
                      <Input
                        placeholder="Nova função"
                        value={newRole.funcao}
                        onChange={(e) => setNewRole({ ...newRole, funcao: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={newRole.salario_base_ref || ''}
                        onChange={(e) => setNewRole({ ...newRole, salario_base_ref: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRole.carga_horaria_ref}
                        onChange={(e) => setNewRole({ ...newRole, carga_horaria_ref: parseFloat(e.target.value) || 220 })}
                        className="h-8 text-right w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={newRole.modalidade}
                        onValueChange={(value) => setNewRole({ ...newRole, modalidade: value as 'CLT' | 'PACOTE' })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLT">CLT</SelectItem>
                          <SelectItem value="PACOTE">Pacote</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleAddRole}
                        disabled={!newRole.funcao || createRole.isPending}
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
    </Layout>
  );
}
