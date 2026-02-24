import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Wrench, CalendarClock, AlertTriangle, AlertOctagon, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ManutencaoForm, { TIPO_LABELS } from '@/components/frotas/ManutencaoForm';
import PlanoManutencaoForm from '@/components/frotas/PlanoManutencaoForm';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';

// ===================== TYPES =====================

type ManutencaoRecord = {
  id: string;
  veiculo_id: string;
  tipo: string;
  descricao: string | null;
  km_previsto: number | null;
  km_realizado: number | null;
  valor: number | null;
  fornecedor: string | null;
  status: string | null;
  data_prevista: string | null;
  data_realizada: string | null;
  comprovante_url: string | null;
  created_at: string;
  veiculos: { placa: string; apelido: string | null } | null;
};

type PlanoRecord = {
  id: string;
  veiculo_id: string | null;
  tipo: string;
  intervalo_km: number | null;
  intervalo_meses: number | null;
  ultimo_km: number | null;
  ultima_data: string | null;
  created_at: string;
  veiculos: { placa: string; apelido: string | null; km_atual: number | null } | null;
};

// ===================== COMPONENT =====================

export default function Manutencao() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = hasRole('admin') || hasRole('rh');

  // --- Registros state ---
  const [formOpen, setFormOpen] = useState(false);
  const [selectedManutencao, setSelectedManutencao] = useState<ManutencaoRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manutencaoToDelete, setManutencaoToDelete] = useState<ManutencaoRecord | null>(null);
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');
  const [filtroStatus, setFiltroStatus] = useState('_todos');
  const [filtroTipo, setFiltroTipo] = useState('_todos');

  // --- Plano state ---
  const [planoFormOpen, setPlanoFormOpen] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState<PlanoRecord | null>(null);
  const [planoDeleteOpen, setPlanoDeleteOpen] = useState(false);
  const [planoToDelete, setPlanoToDelete] = useState<PlanoRecord | null>(null);

  // ===================== QUERIES =====================

  const { data: manutencoes, isLoading: loadingManutencoes } = useQuery({
    queryKey: ['manutencoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manutencoes')
        .select(`
          *,
          veiculos:veiculo_id (placa, apelido)
        `)
        .order('data_prevista', { ascending: false });
      if (error) throw error;
      return data as ManutencaoRecord[];
    },
  });

  const { data: planos, isLoading: loadingPlanos } = useQuery({
    queryKey: ['planos-manutencao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plano_manutencao')
        .select(`
          *,
          veiculos:veiculo_id (placa, apelido, km_atual)
        `)
        .order('tipo');
      if (error) throw error;
      return data as PlanoRecord[];
    },
  });

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

  // ===================== CARDS =====================

  const cardCounts = useMemo(() => {
    if (!manutencoes) return { programada: 0, atencao: 0, vencida: 0, critica: 0 };
    return {
      programada: manutencoes.filter((m) => m.status === 'programada').length,
      atencao: manutencoes.filter((m) => m.status === 'atencao').length,
      vencida: manutencoes.filter((m) => m.status === 'vencida').length,
      critica: manutencoes.filter((m) => m.status === 'critica').length,
    };
  }, [manutencoes]);

  // ===================== REGISTROS FILTER =====================

  const filteredManutencoes = useMemo(() => {
    if (!manutencoes) return [];
    return manutencoes.filter((m) => {
      if (filtroVeiculo !== '_todos' && m.veiculo_id !== filtroVeiculo) return false;
      if (filtroStatus !== '_todos' && m.status !== filtroStatus) return false;
      if (filtroTipo !== '_todos' && m.tipo !== filtroTipo) return false;
      return true;
    });
  }, [manutencoes, filtroVeiculo, filtroStatus, filtroTipo]);

  // ===================== HANDLERS - REGISTROS =====================

  const handleNewManutencao = () => { setSelectedManutencao(null); setFormOpen(true); };
  const handleEditManutencao = (m: ManutencaoRecord) => { setSelectedManutencao(m); setFormOpen(true); };
  const confirmDeleteManutencao = (m: ManutencaoRecord) => { setManutencaoToDelete(m); setDeleteDialogOpen(true); };

  const handleDeleteManutencao = async () => {
    if (!manutencaoToDelete) return;
    try {
      const { error } = await supabase.from('manutencoes').delete().eq('id', manutencaoToDelete.id);
      if (error) throw error;
      toast.success('Manutenção excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] });
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setManutencaoToDelete(null);
    }
  };

  // ===================== HANDLERS - PLANO =====================

  const handleNewPlano = () => { setSelectedPlano(null); setPlanoFormOpen(true); };
  const handleEditPlano = (p: PlanoRecord) => { setSelectedPlano(p); setPlanoFormOpen(true); };
  const confirmDeletePlano = (p: PlanoRecord) => { setPlanoToDelete(p); setPlanoDeleteOpen(true); };

  const handleDeletePlano = async () => {
    if (!planoToDelete) return;
    try {
      const { error } = await supabase.from('plano_manutencao').delete().eq('id', planoToDelete.id);
      if (error) throw error;
      toast.success('Plano excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planos-manutencao'] });
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setPlanoDeleteOpen(false);
      setPlanoToDelete(null);
    }
  };

  // ===================== HELPERS =====================

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'programada':
        return <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30">Programada</Badge>;
      case 'atencao':
        return <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Atenção</Badge>;
      case 'vencida':
        return <Badge variant="default" className="bg-orange-500/20 text-orange-500 border-orange-500/30">Vencida</Badge>;
      case 'critica':
        return <Badge variant="default" className="bg-red-500/20 text-red-500 border-red-500/30">Crítica</Badge>;
      case 'concluida':
        return <Badge variant="default" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">Concluída</Badge>;
      default:
        return <Badge variant="outline">{status || '-'}</Badge>;
    }
  };

  const getPlanoStatusBadge = (kmAtual: number | null, proximoKm: number | null) => {
    if (kmAtual === null || proximoKm === null) return <Badge variant="outline">-</Badge>;
    if (kmAtual >= proximoKm + 2000) return <Badge variant="default" className="bg-red-500/20 text-red-500 border-red-500/30">Crítico</Badge>;
    if (kmAtual >= proximoKm) return <Badge variant="default" className="bg-orange-500/20 text-orange-500 border-orange-500/30">Vencido</Badge>;
    if (kmAtual >= proximoKm - 500) return <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Atenção</Badge>;
    return <Badge variant="default" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">OK</Badge>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatCurrency = (v: number | null) => {
    if (v === null || v === undefined) return '-';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatKm = (km: number | null) => {
    if (km === null || km === undefined) return '-';
    return km.toLocaleString('pt-BR') + ' km';
  };

  // ===================== RENDER =====================

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Manutenção
          </h1>
          <p className="text-muted-foreground">Planos e registros de manutenção da frota</p>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Programadas</CardTitle>
              <CalendarClock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cardCounts.programada}</div>
              <p className="text-xs text-muted-foreground">manutenções agendadas</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Atenção</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{cardCounts.atencao}</div>
              <p className="text-xs text-muted-foreground">próximas do prazo</p>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
              <ShieldAlert className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{cardCounts.vencida}</div>
              <p className="text-xs text-muted-foreground">prazo ultrapassado</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticas</CardTitle>
              <AlertOctagon className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{cardCounts.critica}</div>
              <p className="text-xs text-muted-foreground">ação imediata necessária</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="registros">
          <TabsList>
            <TabsTrigger value="registros">Registros</TabsTrigger>
            <TabsTrigger value="plano">Plano de Manutenção</TabsTrigger>
          </TabsList>

          {/* ==================== TAB REGISTROS ==================== */}
          <TabsContent value="registros" className="space-y-4">
            {/* Filtros + Botão */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
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
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_todos">Todos</SelectItem>
                      <SelectItem value="programada">Programada</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_todos">Todos</SelectItem>
                      {Object.entries(TIPO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {canEdit && (
                <Button onClick={handleNewManutencao} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  Nova Manutenção
                </Button>
              )}
            </div>

            {/* Tabela Registros */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {filteredManutencoes.length} registro{filteredManutencoes.length !== 1 && 's'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingManutencoes ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : filteredManutencoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">KM Previsto</TableHead>
                          <TableHead className="text-right">KM Realizado</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data Prevista</TableHead>
                          <TableHead>Data Realizada</TableHead>
                          {canEdit && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredManutencoes.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">
                                  {m.veiculos?.placa || '-'}
                                </code>
                                {m.veiculos?.apelido && (
                                  <span className="text-xs text-muted-foreground mt-0.5">{m.veiculos.apelido}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{TIPO_LABELS[m.tipo] || m.tipo}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate" title={m.descricao || ''}>{m.descricao || '-'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatKm(m.km_previsto)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatKm(m.km_realizado)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(m.valor)}</TableCell>
                            <TableCell className="text-sm">{m.fornecedor || '-'}</TableCell>
                            <TableCell>{getStatusBadge(m.status)}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(m.data_prevista)}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(m.data_realizada)}</TableCell>
                            {canEdit && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditManutencao(m)} title="Editar">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => confirmDeleteManutencao(m)} title="Excluir">
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
          </TabsContent>

          {/* ==================== TAB PLANO ==================== */}
          <TabsContent value="plano" className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={handleNewPlano} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Plano
                </Button>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {planos?.length || 0} plano{(planos?.length || 0) !== 1 && 's'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPlanos ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : !planos || planos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum plano cadastrado</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Intervalo KM</TableHead>
                          <TableHead className="text-right">Intervalo Meses</TableHead>
                          <TableHead className="text-right">Último KM</TableHead>
                          <TableHead>Última Data</TableHead>
                          <TableHead className="text-right">Próximo KM</TableHead>
                          <TableHead>Status</TableHead>
                          {canEdit && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planos.map((p) => {
                          const proximoKm = p.ultimo_km !== null && p.intervalo_km !== null
                            ? p.ultimo_km + p.intervalo_km
                            : null;
                          const kmAtual = p.veiculos?.km_atual ?? null;

                          return (
                            <TableRow key={p.id}>
                              <TableCell>
                                {p.veiculo_id ? (
                                  <div className="flex flex-col">
                                    <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">
                                      {p.veiculos?.placa || '-'}
                                    </code>
                                    {p.veiculos?.apelido && (
                                      <span className="text-xs text-muted-foreground mt-0.5">{p.veiculos.apelido}</span>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline">Padrão</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{TIPO_LABELS[p.tipo] || p.tipo}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatKm(p.intervalo_km)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{p.intervalo_meses ?? '-'}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatKm(p.ultimo_km)}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{formatDate(p.ultima_data)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatKm(proximoKm)}</TableCell>
                              <TableCell>{getPlanoStatusBadge(kmAtual, proximoKm)}</TableCell>
                              {canEdit && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditPlano(p)} title="Editar">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => confirmDeletePlano(p)} title="Excluir">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== DIALOGS ==================== */}

      {/* Manutenção Form */}
      <ManutencaoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        manutencao={selectedManutencao}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['manutencoes'] });
          queryClient.invalidateQueries({ queryKey: ['planos-manutencao'] });
        }}
      />

      {/* Plano Form */}
      <PlanoManutencaoForm
        open={planoFormOpen}
        onOpenChange={setPlanoFormOpen}
        plano={selectedPlano}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['planos-manutencao'] })}
      />

      {/* Delete Manutenção */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir manutenção?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de manutenção? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteManutencao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Plano */}
      <AlertDialog open={planoDeleteOpen} onOpenChange={setPlanoDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este plano de manutenção? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlano} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
