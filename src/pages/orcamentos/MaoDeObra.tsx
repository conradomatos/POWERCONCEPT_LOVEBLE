import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Trash2, Calculator, RefreshCw } from 'lucide-react';
import { useLaborRoles, type LaborRoleFormData } from '@/hooks/orcamentos/useLaborRoles';
import { useLaborParameters, type LaborParametersFormData } from '@/hooks/orcamentos/useLaborParameters';
import { useLaborCostSnapshot } from '@/hooks/orcamentos/useLaborCostSnapshot';
import { formatCurrency } from '@/lib/currency';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function MaoDeObra() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { roles, isLoading: rolesLoading, createRole, updateRole, deleteRole } = useLaborRoles(selectedRevision?.id);
  const { parameters, isLoading: paramsLoading, upsertParameters } = useLaborParameters(selectedRevision?.id);
  const { snapshots, isLoading: snapshotsLoading, calculateCosts } = useLaborCostSnapshot(selectedRevision?.id);

  const [newRole, setNewRole] = useState<LaborRoleFormData>({
    funcao: '',
    salario_base: 0,
    carga_horaria_mensal: 220,
    modalidade: 'CLT',
  });

  const [paramsForm, setParamsForm] = useState<LaborParametersFormData>({
    encargos_pct: parameters?.encargos_pct ?? 80,
    he50_pct: parameters?.he50_pct ?? 50,
    he100_pct: parameters?.he100_pct ?? 100,
    adicional_noturno_pct: parameters?.adicional_noturno_pct ?? 20,
    periculosidade_pct: parameters?.periculosidade_pct ?? 30,
    insalubridade_pct: parameters?.insalubridade_pct ?? 0,
    improdutividade_pct: parameters?.improdutividade_pct ?? 0,
  });

  // Update form when parameters load
  if (parameters && paramsForm.encargos_pct !== parameters.encargos_pct) {
    setParamsForm({
      encargos_pct: parameters.encargos_pct,
      he50_pct: parameters.he50_pct,
      he100_pct: parameters.he100_pct,
      adicional_noturno_pct: parameters.adicional_noturno_pct,
      periculosidade_pct: parameters.periculosidade_pct,
      insalubridade_pct: parameters.insalubridade_pct,
      improdutividade_pct: parameters.improdutividade_pct,
    });
  }

  const handleAddRole = async () => {
    if (!newRole.funcao) return;
    await createRole.mutateAsync(newRole);
    setNewRole({
      funcao: '',
      salario_base: 0,
      carga_horaria_mensal: 220,
      modalidade: 'CLT',
    });
  };

  const handleSaveParams = async () => {
    await upsertParameters.mutateAsync(paramsForm);
  };

  const handleCalculateCosts = async () => {
    await calculateCosts.mutateAsync({ roles, parameters });
  };

  const isLoading = rolesLoading || paramsLoading || snapshotsLoading;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="funcoes">
        <TabsList>
          <TabsTrigger value="funcoes">Funções</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          <TabsTrigger value="custos">Custo Hora</TabsTrigger>
        </TabsList>

        {/* Tab: Funções */}
        <TabsContent value="funcoes">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Funções de Mão de Obra</CardTitle>
              <CardDescription>Configure as funções e salários base para esta revisão</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Carga Horária</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <Input
                          value={role.funcao}
                          onChange={(e) => updateRole.mutate({ id: role.id, funcao: e.target.value })}
                          disabled={lockState.isLocked}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={role.salario_base}
                          onChange={(e) => updateRole.mutate({ id: role.id, salario_base: parseFloat(e.target.value) || 0 })}
                          disabled={lockState.isLocked}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={role.carga_horaria_mensal}
                          onChange={(e) => updateRole.mutate({ id: role.id, carga_horaria_mensal: parseFloat(e.target.value) || 220 })}
                          disabled={lockState.isLocked}
                          className="h-8 text-right w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={role.modalidade}
                          onValueChange={(value) => updateRole.mutate({ id: role.id, modalidade: value as 'CLT' | 'PACOTE' })}
                          disabled={lockState.isLocked}
                        >
                          <SelectTrigger className="h-8 w-28">
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
                          value={newRole.salario_base || ''}
                          onChange={(e) => setNewRole({ ...newRole, salario_base: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={newRole.carga_horaria_mensal}
                          onChange={(e) => setNewRole({ ...newRole, carga_horaria_mensal: parseFloat(e.target.value) || 220 })}
                          className="h-8 text-right w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={newRole.modalidade}
                          onValueChange={(value) => setNewRole({ ...newRole, modalidade: value as 'CLT' | 'PACOTE' })}
                        >
                          <SelectTrigger className="h-8 w-28">
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
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Parâmetros */}
        <TabsContent value="parametros">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Parâmetros de Mão de Obra</CardTitle>
              <CardDescription>Configure encargos e adicionais para cálculo do custo hora</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Encargos (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paramsForm.encargos_pct}
                    onChange={(e) => setParamsForm({ ...paramsForm, encargos_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HE 50% (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paramsForm.he50_pct}
                    onChange={(e) => setParamsForm({ ...paramsForm, he50_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HE 100% (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paramsForm.he100_pct}
                    onChange={(e) => setParamsForm({ ...paramsForm, he100_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adic. Noturno (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paramsForm.adicional_noturno_pct}
                    onChange={(e) => setParamsForm({ ...paramsForm, adicional_noturno_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Periculosidade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paramsForm.periculosidade_pct}
                    onChange={(e) => setParamsForm({ ...paramsForm, periculosidade_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Insalubridade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paramsForm.insalubridade_pct}
                    onChange={(e) => setParamsForm({ ...paramsForm, insalubridade_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Improdutividade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paramsForm.improdutividade_pct}
                    onChange={(e) => setParamsForm({ ...paramsForm, improdutividade_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                  />
                </div>
              </div>
              
              {!lockState.isLocked && (
                <div className="mt-6 flex gap-2">
                  <Button onClick={handleSaveParams} disabled={upsertParameters.isPending}>
                    Salvar Parâmetros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Custo Hora */}
        <TabsContent value="custos">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Custo Hora por Função</CardTitle>
                <CardDescription>Resultado do cálculo de custo hora com base nos parâmetros</CardDescription>
              </div>
              {!lockState.isLocked && (
                <Button onClick={handleCalculateCosts} disabled={calculateCosts.isPending}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalcular Custos
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Custo Hora Normal</TableHead>
                    <TableHead className="text-right">Custo HE 50%</TableHead>
                    <TableHead className="text-right">Custo HE 100%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium">{snapshot.labor_role?.funcao || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(snapshot.memoria_json?.salario_base || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(snapshot.custo_hora_normal)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(snapshot.custo_hora_he50)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(snapshot.custo_hora_he100)}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {snapshots.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum custo calculado. Configure as funções e parâmetros e clique em "Recalcular Custos".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
