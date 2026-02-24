import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DollarSign,
  Fuel,
  Wrench,
  Car,
  Plus,
  Pencil,
  Trash2,
  Receipt,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DespesaDeslocamentoForm, { DESPESA_TIPO_LABELS } from '@/components/frotas/DespesaDeslocamentoForm';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';

// ===================== HELPERS =====================

function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    inicio: start.toISOString().slice(0, 10),
    fim: end.toISOString().slice(0, 10),
  };
}

function formatCurrency(v: number | null | undefined) {
  if (v === null || v === undefined) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatKm(km: number | null | undefined) {
  if (!km) return '-';
  return km.toLocaleString('pt-BR') + ' km';
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

// ===================== TYPES =====================

type VeiculoCusto = {
  veiculo_id: string;
  placa: string;
  apelido: string | null;
  kmRodado: number;
  combustivel: number;
  manutencao: number;
  deslocamento: number;
  depreciacao: number;
  custoTotal: number;
  custoKm: number | null;
};

type DespesaRecord = {
  id: string;
  veiculo_id: string;
  colaborador_id: string | null;
  projeto_id: string | null;
  tipo: string;
  valor: number;
  descricao: string | null;
  comprovante_url: string | null;
  data_despesa: string | null;
  created_at: string;
  veiculos: { placa: string; apelido: string | null } | null;
  collaborators: { full_name: string } | null;
  projetos: { nome: string; os: string } | null;
};

// ===================== COMPONENT =====================

export default function FrotasCustos() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = hasRole('admin') || hasRole('rh');

  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);

  // Filters
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState(defaultPeriod.inicio);
  const [filtroDataFim, setFiltroDataFim] = useState(defaultPeriod.fim);

  // Despesa CRUD state
  const [despesaFormOpen, setDespesaFormOpen] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<DespesaRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [despesaToDelete, setDespesaToDelete] = useState<DespesaRecord | null>(null);

  // ===================== QUERIES =====================

  const { data: veiculosFilter } = useQuery({
    queryKey: ['veiculos-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, apelido')
        .order('placa');
      if (error) throw error;
      return data;
    },
  });

  // All vehicles with km_atual (for depreciacao)
  const { data: veiculosFull } = useQuery({
    queryKey: ['veiculos-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, apelido, km_atual, status')
        .eq('status', 'ativo')
        .order('placa');
      if (error) throw error;
      return data as { id: string; placa: string; apelido: string | null; km_atual: number | null; status: string }[];
    },
  });

  // Abastecimentos no período
  const { data: abastecimentos } = useQuery({
    queryKey: ['custos-abastecimentos', filtroDataInicio, filtroDataFim],
    queryFn: async () => {
      let q = supabase
        .from('abastecimentos')
        .select('veiculo_id, valor_total, data_abastecimento');
      if (filtroDataInicio) q = q.gte('data_abastecimento', filtroDataInicio);
      if (filtroDataFim) q = q.lte('data_abastecimento', filtroDataFim + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; valor_total: number | null; data_abastecimento: string | null }[];
    },
  });

  // Manutenções concluídas no período
  const { data: manutencoes } = useQuery({
    queryKey: ['custos-manutencoes', filtroDataInicio, filtroDataFim],
    queryFn: async () => {
      let q = supabase
        .from('manutencoes')
        .select('veiculo_id, valor, data_realizada')
        .eq('status', 'concluida');
      if (filtroDataInicio) q = q.gte('data_realizada', filtroDataInicio);
      if (filtroDataFim) q = q.lte('data_realizada', filtroDataFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; valor: number | null; data_realizada: string | null }[];
    },
  });

  // Registros KM (tipo volta) no período
  const { data: registrosKm } = useQuery({
    queryKey: ['custos-registros-km', filtroDataInicio, filtroDataFim],
    queryFn: async () => {
      let q = supabase
        .from('registros_km')
        .select('veiculo_id, km_calculado, data_registro')
        .eq('tipo', 'volta');
      if (filtroDataInicio) q = q.gte('data_registro', filtroDataInicio);
      if (filtroDataFim) q = q.lte('data_registro', filtroDataFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; km_calculado: number | null; data_registro: string }[];
    },
  });

  // Despesas deslocamento no período
  const { data: despesas, isLoading: loadingDespesas } = useQuery({
    queryKey: ['despesas-deslocamento', filtroDataInicio, filtroDataFim],
    queryFn: async () => {
      let q = supabase
        .from('despesas_deslocamento')
        .select(`
          *,
          veiculos:veiculo_id (placa, apelido),
          collaborators:colaborador_id (full_name),
          projetos:projeto_id (nome, os)
        `)
        .order('data_despesa', { ascending: false });
      if (filtroDataInicio) q = q.gte('data_despesa', filtroDataInicio);
      if (filtroDataFim) q = q.lte('data_despesa', filtroDataFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as DespesaRecord[];
    },
  });

  // Depreciação config
  const { data: depreciacaoConfig } = useQuery({
    queryKey: ['depreciacao-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('depreciacao_config')
        .select('veiculo_id, depreciacao_mensal');
      if (error) throw error;
      return data as { veiculo_id: string; depreciacao_mensal: number | null }[];
    },
  });

  // ===================== CALCULATED DATA =====================

  // Proporcional meses do período
  const mesesPeriodo = useMemo(() => {
    if (!filtroDataInicio || !filtroDataFim) return 1;
    const start = new Date(filtroDataInicio);
    const end = new Date(filtroDataFim);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    return Math.max(diffDays / 30, 0.1);
  }, [filtroDataInicio, filtroDataFim]);

  const custosVeiculos = useMemo<VeiculoCusto[]>(() => {
    if (!veiculosFull) return [];

    return veiculosFull
      .map((v) => {
        const combustivel = (abastecimentos || [])
          .filter((a) => a.veiculo_id === v.id)
          .reduce((acc, a) => acc + (a.valor_total || 0), 0);

        const manutencaoVal = (manutencoes || [])
          .filter((m) => m.veiculo_id === v.id)
          .reduce((acc, m) => acc + (m.valor || 0), 0);

        const deslocamentoVal = (despesas || [])
          .filter((d) => d.veiculo_id === v.id)
          .reduce((acc, d) => acc + (d.valor || 0), 0);

        const kmRodado = (registrosKm || [])
          .filter((r) => r.veiculo_id === v.id)
          .reduce((acc, r) => acc + (r.km_calculado || 0), 0);

        const depConfig = (depreciacaoConfig || []).find((d) => d.veiculo_id === v.id);
        const depreciacao = depConfig?.depreciacao_mensal
          ? depConfig.depreciacao_mensal * mesesPeriodo
          : 0;

        const custoTotal = combustivel + manutencaoVal + deslocamentoVal + depreciacao;
        const custoKm = kmRodado > 0 ? custoTotal / kmRodado : null;

        return {
          veiculo_id: v.id,
          placa: v.placa,
          apelido: v.apelido,
          kmRodado,
          combustivel,
          manutencao: manutencaoVal,
          deslocamento: deslocamentoVal,
          depreciacao: Math.round(depreciacao * 100) / 100,
          custoTotal,
          custoKm,
        };
      })
      .filter((c) => {
        if (filtroVeiculo !== '_todos' && c.veiculo_id !== filtroVeiculo) return false;
        return true;
      })
      .sort((a, b) => b.custoTotal - a.custoTotal);
  }, [veiculosFull, abastecimentos, manutencoes, despesas, registrosKm, depreciacaoConfig, mesesPeriodo, filtroVeiculo]);

  const totais = useMemo(() => {
    return custosVeiculos.reduce(
      (acc, c) => ({
        kmRodado: acc.kmRodado + c.kmRodado,
        combustivel: acc.combustivel + c.combustivel,
        manutencao: acc.manutencao + c.manutencao,
        deslocamento: acc.deslocamento + c.deslocamento,
        depreciacao: acc.depreciacao + c.depreciacao,
        custoTotal: acc.custoTotal + c.custoTotal,
      }),
      { kmRodado: 0, combustivel: 0, manutencao: 0, deslocamento: 0, depreciacao: 0, custoTotal: 0 },
    );
  }, [custosVeiculos]);

  // Cards de resumo
  const resumoCards = useMemo(() => {
    return {
      total: totais.custoTotal,
      combustivel: totais.combustivel,
      manutencao: totais.manutencao,
      deslocamento: totais.deslocamento,
    };
  }, [totais]);

  // Despesas filtradas por veículo
  const filteredDespesas = useMemo(() => {
    if (!despesas) return [];
    if (filtroVeiculo === '_todos') return despesas;
    return despesas.filter((d) => d.veiculo_id === filtroVeiculo);
  }, [despesas, filtroVeiculo]);

  // ===================== HANDLERS =====================

  const handleNewDespesa = () => { setSelectedDespesa(null); setDespesaFormOpen(true); };
  const handleEditDespesa = (d: DespesaRecord) => { setSelectedDespesa(d); setDespesaFormOpen(true); };
  const confirmDeleteDespesa = (d: DespesaRecord) => { setDespesaToDelete(d); setDeleteDialogOpen(true); };

  const handleDeleteDespesa = async () => {
    if (!despesaToDelete) return;
    try {
      const { error } = await supabase.from('despesas_deslocamento').delete().eq('id', despesaToDelete.id);
      if (error) throw error;
      toast.success('Despesa excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['despesas-deslocamento'] });
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setDespesaToDelete(null);
    }
  };

  const getDespesaTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'pedagio':
        return <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30">Pedágio</Badge>;
      case 'estacionamento':
        return <Badge variant="default" className="bg-purple-500/20 text-purple-500 border-purple-500/30">Estacionamento</Badge>;
      case 'lavagem':
        return <Badge variant="default" className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30">Lavagem</Badge>;
      case 'outro':
        return <Badge variant="outline">Outro</Badge>;
      default:
        return <Badge variant="outline">{DESPESA_TIPO_LABELS[tipo] || tipo}</Badge>;
    }
  };

  // ===================== RENDER =====================

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Custos da Frota
          </h1>
          <p className="text-muted-foreground">Visão consolidada de custos por veículo</p>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total Frota</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumoCards.total)}</div>
              <p className="text-xs text-muted-foreground">no período selecionado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Combustível</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumoCards.combustivel)}</div>
              <p className="text-xs text-muted-foreground">abastecimentos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manutenção</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumoCards.manutencao)}</div>
              <p className="text-xs text-muted-foreground">concluídas no período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deslocamento</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumoCards.deslocamento)}</div>
              <p className="text-xs text-muted-foreground">pedágio, estacionamento, outros</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos">Todos</SelectItem>
                    {veiculosFilter?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa} {v.apelido ? `- ${v.apelido}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Custos por Veículo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custo por Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            {custosVeiculos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum dado encontrado no período</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead className="text-right">KM Rodado</TableHead>
                      <TableHead className="text-right">Combustível</TableHead>
                      <TableHead className="text-right">Manutenção</TableHead>
                      <TableHead className="text-right">Deslocamento</TableHead>
                      <TableHead className="text-right">Depreciação</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="text-right">Custo/KM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custosVeiculos.map((c) => (
                      <TableRow key={c.veiculo_id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">
                              {c.placa}
                            </code>
                            {c.apelido && (
                              <span className="text-xs text-muted-foreground mt-0.5">{c.apelido}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatKm(c.kmRodado)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(c.combustivel)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(c.manutencao)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(c.deslocamento)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(c.depreciacao)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(c.custoTotal)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {c.custoKm !== null ? formatCurrency(c.custoKm) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right font-mono">{formatKm(totais.kmRodado)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totais.combustivel)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totais.manutencao)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totais.deslocamento)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totais.depreciacao)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totais.custoTotal)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {totais.kmRodado > 0 ? formatCurrency(totais.custoTotal / totais.kmRodado) : '-'}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção: Despesas de Deslocamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Despesas de Deslocamento
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredDespesas.length} registro{filteredDespesas.length !== 1 && 's'}
              </p>
            </div>
            {canEdit && (
              <Button onClick={handleNewDespesa} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Despesa
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingDespesas ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredDespesas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma despesa encontrada no período</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Comprovante</TableHead>
                      {canEdit && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDespesas.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(d.data_despesa)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">
                              {d.veiculos?.placa || '-'}
                            </code>
                            {d.veiculos?.apelido && (
                              <span className="text-xs text-muted-foreground mt-0.5">{d.veiculos.apelido}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{d.collaborators?.full_name || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {d.projetos ? (
                            <span>
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">{d.projetos.os}</code>
                              {d.projetos.nome}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getDespesaTipoBadge(d.tipo)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(d.valor)}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={d.descricao || ''}>
                          {d.descricao || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {d.comprovante_url ? (
                            <a
                              href={d.comprovante_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                            >
                              Ver
                            </a>
                          ) : '-'}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditDespesa(d)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmDeleteDespesa(d)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ==================== DIALOGS ==================== */}

      <DespesaDeslocamentoForm
        open={despesaFormOpen}
        onOpenChange={setDespesaFormOpen}
        despesa={selectedDespesa}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['despesas-deslocamento'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa de deslocamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDespesa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
