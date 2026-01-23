import { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Trash2, RefreshCw, Search, Database, ExternalLink } from 'lucide-react';
import { useLaborRoles } from '@/hooks/orcamentos/useLaborRoles';
import { useLaborRoleCatalog, type LaborRoleCatalogItem } from '@/hooks/orcamentos/useLaborRoleCatalog';
import { useLaborParameters, type LaborParametersFormData } from '@/hooks/orcamentos/useLaborParameters';
import { useLaborCostSnapshot } from '@/hooks/orcamentos/useLaborCostSnapshot';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function MaoDeObra() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { roles, isLoading: rolesLoading, createFromCatalog, updateRole, deleteRole } = useLaborRoles(selectedRevision?.id);
  const { roles: catalogItems, isLoading: catalogLoading } = useLaborRoleCatalog();
  const { parameters, isLoading: paramsLoading, upsertParameters } = useLaborParameters(selectedRevision?.id);
  const { snapshots, isLoading: snapshotsLoading, calculateCosts } = useLaborCostSnapshot(selectedRevision?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [paramsForm, setParamsForm] = useState<LaborParametersFormData>({
    encargos_pct: 80,
    he50_pct: 50,
    he100_pct: 100,
    adicional_noturno_pct: 20,
    periculosidade_pct: 30,
    insalubridade_pct: 0,
    improdutividade_pct: 0,
  });

  // Update form when parameters load
  useEffect(() => {
    if (parameters) {
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
  }, [parameters]);

  const handleAddFromCatalog = async (catalogItem: LaborRoleCatalogItem) => {
    await createFromCatalog.mutateAsync({
      catalogId: catalogItem.id,
      salario_base: catalogItem.salario_base_ref || 0,
    });
    setDialogOpen(false);
  };

  const handleSaveParams = async () => {
    await upsertParameters.mutateAsync(paramsForm);
  };

  const handleCalculateCosts = async () => {
    await calculateCosts.mutateAsync({ roles, parameters });
  };

  // Filter catalog items based on search and already added roles
  const addedCatalogIds = new Set(roles.filter(r => r.catalog_id).map(r => r.catalog_id));
  const filteredCatalog = catalogItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.funcao.toLowerCase().includes(searchTerm.toLowerCase());
    const notAdded = !addedCatalogIds.has(item.id);
    return matchesSearch && notAdded;
  });

  const isLoading = rolesLoading || paramsLoading || snapshotsLoading;

  return (
    <TooltipProvider>
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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Funções de Mão de Obra</CardTitle>
                  <CardDescription>
                    Selecione funções do catálogo global e defina salários específicos para este orçamento
                  </CardDescription>
                </div>
                {!lockState.isLocked && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar do Catálogo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5" />
                          Selecionar Função do Catálogo Global
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                        <Input
                          placeholder="Filtrar por nome..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="flex-1 overflow-auto">
                          {catalogLoading ? (
                            <p className="text-center py-4 text-muted-foreground">Carregando...</p>
                          ) : filteredCatalog.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Função</TableHead>
                                  <TableHead>Modalidade</TableHead>
                                  <TableHead className="text-right">Carga Horária</TableHead>
                                  <TableHead className="text-right">Salário Ref.</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredCatalog.map((item) => (
                                  <TableRow key={item.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{item.funcao}</TableCell>
                                    <TableCell>{item.modalidade}</TableCell>
                                    <TableCell className="text-right font-mono">{item.carga_horaria_ref}h</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(item.salario_base_ref || 0)}
                                    </TableCell>
                                    <TableCell>
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleAddFromCatalog(item)}
                                        disabled={createFromCatalog.isPending}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Usar
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>{searchTerm ? 'Nenhuma função encontrada' : 'Todas as funções já foram adicionadas'}</p>
                              <p className="text-sm mt-1">
                                <a href="/orcamentos/bases/mo-funcoes" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                                  Cadastrar no catálogo global
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Função</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead className="text-right">Carga Horária</TableHead>
                      <TableHead className="text-right">Salário Base</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma função adicionada</p>
                          <p className="text-sm">Clique em "Adicionar do Catálogo" para começar</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role) => {
                        const isFromCatalog = !!role.catalog_id;
                        return (
                          <TableRow key={role.id}>
                            {/* Função - read-only se veio do catálogo */}
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(
                                    "block px-2 py-1 rounded font-medium",
                                    isFromCatalog 
                                      ? "bg-muted text-muted-foreground cursor-help" 
                                      : "bg-background"
                                  )}>
                                    {role.funcao}
                                  </span>
                                </TooltipTrigger>
                                {isFromCatalog && (
                                  <TooltipContent>
                                    <p>Valor do catálogo global (não editável)</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TableCell>
                            
                            {/* Modalidade - read-only se veio do catálogo */}
                            <TableCell>
                              <span className={cn(
                                "block px-2 py-1 rounded text-center",
                                isFromCatalog 
                                  ? "bg-muted text-muted-foreground" 
                                  : "bg-background"
                              )}>
                                {role.modalidade}
                              </span>
                            </TableCell>
                            
                            {/* Carga Horária - read-only se veio do catálogo */}
                            <TableCell>
                              <span className={cn(
                                "block px-2 py-1 rounded text-right font-mono",
                                isFromCatalog 
                                  ? "bg-muted text-muted-foreground" 
                                  : "bg-background"
                              )}>
                                {role.carga_horaria_mensal}h
                              </span>
                            </TableCell>
                            
                            {/* Salário - EDITÁVEL (específico do orçamento) */}
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input
                                    type="number"
                                    value={role.salario_base}
                                    onChange={(e) => updateRole.mutate({ id: role.id, salario_base: parseFloat(e.target.value) || 0 })}
                                    disabled={lockState.isLocked}
                                    className={cn(
                                      "h-8 text-right",
                                      "bg-primary/5 border-primary/20 focus:border-primary"
                                    )}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Salário específico deste orçamento</p>
                                  {role.salario_referencia && (
                                    <p className="text-muted-foreground">
                                      Ref. catálogo: {formatCurrency(role.salario_referencia)}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
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
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                
                {/* Legend */}
                {roles.length > 0 && (
                  <div className="flex items-center gap-6 px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground mt-4 rounded-b">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-muted border"></div>
                      <span>Campos do catálogo (não editáveis)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-primary/5 border border-primary/20"></div>
                      <span>Campos do orçamento (editáveis)</span>
                    </div>
                  </div>
                )}
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
    </TooltipProvider>
  );
}
