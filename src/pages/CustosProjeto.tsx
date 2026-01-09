import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  Clock,
  Package,
  Wrench,
  AlertCircle,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CustoProjeto {
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  empresa_nome: string;
  custo_mao_obra: number;
  horas_totais: number;
  custo_medio_hora: number;
  registros_mo_ok: number;
  registros_sem_custo: number;
  custo_material: number;
  custo_servico: number;
  custo_outro: number;
  total_custos_diretos: number;
  custo_total: number;
}

interface CustoDireto {
  id: string;
  projeto_id: string;
  data: string;
  tipo: 'MATERIAL' | 'SERVICO' | 'OUTRO';
  descricao: string;
  valor: number;
  fornecedor: string | null;
  documento: string | null;
  observacao: string | null;
}

interface CustoProjetoDia {
  id: string;
  colaborador_id: string;
  cpf: string;
  projeto_id: string;
  data: string;
  horas_normais: number;
  horas_50: number;
  horas_100: number;
  horas_noturnas: number;
  custo_total: number | null;
  status: 'OK' | 'SEM_CUSTO';
}

export default function CustosProjeto() {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasAnyRole, hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjeto, setSelectedProjeto] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCusto, setNewCusto] = useState({
    projeto_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo: 'MATERIAL' as 'MATERIAL' | 'SERVICO' | 'OUTRO',
    descricao: '',
    valor: '',
    fornecedor: '',
    documento: '',
    observacao: '',
  });

  // Fetch custos consolidados por projeto
  const { data: custosProjetos, isLoading: loadingCustos } = useQuery({
    queryKey: ['custos-projetos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_custo_projeto')
        .select('*')
        .order('custo_total', { ascending: false });

      if (error) throw error;
      return data as CustoProjeto[];
    },
    enabled: !!user,
  });

  // Fetch projetos para o select
  const { data: projetos } = useQuery({
    queryKey: ['projetos-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os')
        .eq('status', 'ativo')
        .order('os');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch custos diretos do projeto selecionado
  const { data: custosDirectos, refetch: refetchCustosDiretos } = useQuery({
    queryKey: ['custos-diretos', selectedProjeto],
    queryFn: async () => {
      if (!selectedProjeto) return [];
      const { data, error } = await supabase
        .from('custos_diretos_projeto')
        .select('*')
        .eq('projeto_id', selectedProjeto)
        .order('data', { ascending: false });
      if (error) throw error;
      return data as CustoDireto[];
    },
    enabled: !!selectedProjeto,
  });

  // Fetch pendências (registros SEM_CUSTO) do projeto selecionado
  const { data: pendencias } = useQuery({
    queryKey: ['pendencias-custo', selectedProjeto],
    queryFn: async () => {
      if (!selectedProjeto) return [];
      const { data, error } = await supabase
        .from('custo_projeto_dia')
        .select('*, collaborators(full_name)')
        .eq('projeto_id', selectedProjeto)
        .eq('status', 'SEM_CUSTO')
        .order('data', { ascending: false });
      if (error) throw error;
      return data as (CustoProjetoDia & { collaborators: { full_name: string } })[];
    },
    enabled: !!selectedProjeto,
  });

  // Fetch detalhe de MO por colaborador do projeto selecionado
  const { data: detalheMO } = useQuery({
    queryKey: ['detalhe-mo', selectedProjeto],
    queryFn: async () => {
      if (!selectedProjeto) return [];
      const { data, error } = await supabase
        .from('custo_projeto_dia')
        .select('*, collaborators(full_name)')
        .eq('projeto_id', selectedProjeto)
        .eq('status', 'OK')
        .order('data', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (CustoProjetoDia & { collaborators: { full_name: string } })[];
    },
    enabled: !!selectedProjeto,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!hasAnyRole()) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Pendente</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  const filteredProjetos = custosProjetos?.filter(
    (p) =>
      p.projeto_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projeto_os.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.empresa_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProjetoData = custosProjetos?.find((p) => p.projeto_id === selectedProjeto);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleAddCustoDireto = async () => {
    if (!newCusto.projeto_id || !newCusto.descricao || !newCusto.valor) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const { error } = await supabase.from('custos_diretos_projeto').insert({
      projeto_id: newCusto.projeto_id,
      data: newCusto.data,
      tipo: newCusto.tipo,
      descricao: newCusto.descricao,
      valor: parseFloat(newCusto.valor),
      fornecedor: newCusto.fornecedor || null,
      documento: newCusto.documento || null,
      observacao: newCusto.observacao || null,
      created_by: user.id,
    });

    if (error) {
      toast.error('Erro ao adicionar custo: ' + error.message);
      return;
    }

    toast.success('Custo direto adicionado com sucesso');
    setShowAddDialog(false);
    setNewCusto({
      projeto_id: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      tipo: 'MATERIAL',
      descricao: '',
      valor: '',
      fornecedor: '',
      documento: '',
      observacao: '',
    });
    refetchCustosDiretos();
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'MATERIAL':
        return <Package className="h-4 w-4" />;
      case 'SERVICO':
        return <Wrench className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'MATERIAL':
        return 'default';
      case 'SERVICO':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Calculate totals
  const totalGeral = filteredProjetos?.reduce((acc, p) => acc + p.custo_total, 0) || 0;
  const totalMO = filteredProjetos?.reduce((acc, p) => acc + p.custo_mao_obra, 0) || 0;
  const totalDiretos = filteredProjetos?.reduce((acc, p) => acc + p.total_custos_diretos, 0) || 0;
  const totalPendencias = filteredProjetos?.reduce((acc, p) => acc + p.registros_sem_custo, 0) || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Custos de Projetos</h2>
            <p className="text-muted-foreground">
              Análise consolidada de custos por projeto
            </p>
          </div>
          {(hasRole('admin') || hasRole('rh')) && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Custo Direto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Custo Direto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Projeto *</Label>
                    <Select
                      value={newCusto.projeto_id}
                      onValueChange={(v) => setNewCusto({ ...newCusto, projeto_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projetos?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.os} - {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Input
                        type="date"
                        value={newCusto.data}
                        onChange={(e) => setNewCusto({ ...newCusto, data: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select
                        value={newCusto.tipo}
                        onValueChange={(v) =>
                          setNewCusto({ ...newCusto, tipo: v as 'MATERIAL' | 'SERVICO' | 'OUTRO' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MATERIAL">Material</SelectItem>
                          <SelectItem value="SERVICO">Serviço</SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input
                      value={newCusto.descricao}
                      onChange={(e) => setNewCusto({ ...newCusto, descricao: e.target.value })}
                      placeholder="Descrição do custo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCusto.valor}
                      onChange={(e) => setNewCusto({ ...newCusto, valor: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fornecedor</Label>
                      <Input
                        value={newCusto.fornecedor}
                        onChange={(e) => setNewCusto({ ...newCusto, fornecedor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Documento (NF/ID)</Label>
                      <Input
                        value={newCusto.documento}
                        onChange={(e) => setNewCusto({ ...newCusto, documento: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Textarea
                      value={newCusto.observacao}
                      onChange={(e) => setNewCusto({ ...newCusto, observacao: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddCustoDireto}>Salvar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Custo Total
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalGeral)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mão de Obra
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMO)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Custos Diretos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalDiretos)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendências
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{totalPendencias}</div>
              <p className="text-xs text-muted-foreground">registros sem custo</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projeto, OS ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Mão de Obra</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Custos Diretos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Pendências</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCustos ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredProjetos?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum projeto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjetos?.map((p) => (
                    <TableRow
                      key={p.projeto_id}
                      className={selectedProjeto === p.projeto_id ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-mono">{p.projeto_os}</TableCell>
                      <TableCell className="font-medium">{p.projeto_nome}</TableCell>
                      <TableCell className="text-muted-foreground">{p.empresa_nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.custo_mao_obra)}</TableCell>
                      <TableCell className="text-right">{p.horas_totais.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(p.total_custos_diretos)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(p.custo_total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.registros_sem_custo > 0 ? (
                          <Badge variant="destructive">{p.registros_sem_custo}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedProjeto(
                              selectedProjeto === p.projeto_id ? null : p.projeto_id
                            )
                          }
                        >
                          {selectedProjeto === p.projeto_id ? 'Fechar' : 'Detalhar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {selectedProjeto && selectedProjetoData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">
                  {selectedProjetoData.projeto_os}
                </span>
                <span>{selectedProjetoData.projeto_nome}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="resumo">
                <TabsList>
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="mo">Mão de Obra</TabsTrigger>
                  <TabsTrigger value="diretos">Custos Diretos</TabsTrigger>
                  <TabsTrigger value="pendencias">
                    Pendências
                    {(pendencias?.length || 0) > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {pendencias?.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="resumo" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Mão de Obra</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          {formatCurrency(selectedProjetoData.custo_mao_obra)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedProjetoData.horas_totais.toFixed(1)} horas •{' '}
                          {formatCurrency(selectedProjetoData.custo_medio_hora)}/h
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Materiais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          {formatCurrency(selectedProjetoData.custo_material)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Serviços</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          {formatCurrency(selectedProjetoData.custo_servico)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="mo" className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Colaborador</TableHead>
                        <TableHead className="text-right">Normal</TableHead>
                        <TableHead className="text-right">50%</TableHead>
                        <TableHead className="text-right">100%</TableHead>
                        <TableHead className="text-right">Noturna</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalheMO?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            Nenhum registro de mão de obra
                          </TableCell>
                        </TableRow>
                      ) : (
                        detalheMO?.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{format(new Date(d.data), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{d.collaborators?.full_name || d.cpf}</TableCell>
                            <TableCell className="text-right">{d.horas_normais}h</TableCell>
                            <TableCell className="text-right">{d.horas_50}h</TableCell>
                            <TableCell className="text-right">{d.horas_100}h</TableCell>
                            <TableCell className="text-right">{d.horas_noturnas}h</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(d.custo_total || 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="diretos" className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {custosDirectos?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            Nenhum custo direto registrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        custosDirectos?.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{format(new Date(c.data), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={getTipoBadgeVariant(c.tipo)} className="gap-1">
                                {getTipoIcon(c.tipo)}
                                {c.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>{c.descricao}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {c.fornecedor || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-sm">
                              {c.documento || '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(c.valor)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="pendencias" className="pt-4">
                  {pendencias?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>Nenhuma pendência de custo</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-destructive">
                        Os registros abaixo não possuem custo de hora cadastrado para a data do
                        apontamento. Configure o custo vigente na página de custos do colaborador.
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>CPF</TableHead>
                            <TableHead className="text-right">Horas</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendencias?.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{format(new Date(p.data), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{p.collaborators?.full_name || '-'}</TableCell>
                              <TableCell className="font-mono text-sm">{p.cpf}</TableCell>
                              <TableCell className="text-right">
                                {(
                                  p.horas_normais +
                                  p.horas_50 +
                                  p.horas_100 +
                                  p.horas_noturnas
                                ).toFixed(1)}
                                h
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/collaborators/${p.colaborador_id}/costs`)
                                  }
                                >
                                  Configurar Custo
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
