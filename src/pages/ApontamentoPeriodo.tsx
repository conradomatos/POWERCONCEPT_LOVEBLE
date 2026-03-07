import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parse, isWeekend, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Eye, Pencil, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApontamentoPeriodo, type DiaApontamento } from '@/hooks/useApontamentoPeriodo';
import { useColaboradoresAtivos } from '@/hooks/useApontamentoSimplificado';
import { CollaboratorAvatar } from '@/components/CollaboratorAvatar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getStatusConfig(status: DiaApontamento['status']) {
  switch (status) {
    case 'CONCILIADO':
      return { icon: '✅', label: 'Conciliado', className: 'text-green-600 dark:text-green-400' };
    case 'PENDENTE':
      return { icon: '⚠', label: 'Pendente', className: 'text-yellow-600 dark:text-yellow-400' };
    case 'DIVERGENTE':
      return { icon: '⚠', label: 'Divergente', className: 'text-orange-600 dark:text-orange-400' };
    case 'AUTO':
      return { icon: '🔵', label: 'Auto', className: 'text-blue-600 dark:text-blue-400' };
    case 'FOLGA':
      return { icon: '—', label: 'Folga', className: 'text-muted-foreground' };
    case 'SEM_MARCACAO':
      return { icon: '—', label: 'Sem marcação', className: 'text-muted-foreground' };
    default:
      return { icon: '—', label: status, className: 'text-muted-foreground' };
  }
}

function getTipoLabel(dia: DiaApontamento) {
  if (dia.tipoAfastamento === 'FERIAS') return 'Férias';
  if (dia.tipoAfastamento === 'ATESTADO') return 'Atestado';
  if (dia.tipoAfastamento === 'LICENCA') return 'Licença';
  if (dia.tipoDia === 'FOLGA') return 'Folga';
  if (dia.tipoDia === 'FERIADO') return 'Feriado';
  if (dia.tipoDia === 'SEM_MARCACAO') return 'Sem marcação';
  return 'Normal';
}

export default function ApontamentoPeriodo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, hasRole } = useAuth();

  const canAccess = hasRole('super_admin') || hasRole('admin') || hasRole('rh');

  // Inicializar com query params se existirem
  const [colaboradorId, setColaboradorId] = useState<string>(
    searchParams.get('colaborador') || ''
  );
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [mesAno, setMesAno] = useState<string>(
    searchParams.get('mes') || currentMonth
  );

  const { data: colaboradores } = useColaboradoresAtivos();
  const { dias, isLoading: loadingDias } = useApontamentoPeriodo(
    colaboradorId || undefined,
    mesAno || undefined
  );

  // Navegação de mês
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [ano, mes] = mesAno.split('-').map(Number);
    const date = new Date(ano, mes - 1);
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setMesAno(format(date, 'yyyy-MM'));
  };

  // Resumo do mês
  const resumo = useMemo(() => {
    const diasUteis = dias.filter(d => d.status !== 'FOLGA');
    const pendentes = dias.filter(d => d.status === 'PENDENTE' || d.status === 'DIVERGENTE');
    const conciliados = dias.filter(d => d.status === 'CONCILIADO');
    const auto = dias.filter(d => d.status === 'AUTO');
    const totalSecullum = dias.reduce((acc, d) => acc + d.horasSecullum, 0);
    const totalApontado = dias.reduce((acc, d) => acc + d.horasApontadas, 0);
    const totalPendente = dias.reduce((acc, d) => acc + d.horasPendentes, 0);
    const progresso = totalSecullum > 0 ? (totalApontado / totalSecullum) * 100 : 0;

    return {
      diasUteis: diasUteis.length,
      pendentes: pendentes.length,
      conciliados: conciliados.length,
      auto: auto.length,
      totalSecullum,
      totalApontado,
      totalPendente,
      progresso,
    };
  }, [dias]);

  const colaboradorSelecionado = colaboradores?.find(c => c.id === colaboradorId);
  const mesLabel = mesAno
    ? format(parse(mesAno, 'yyyy-MM', new Date()), "MMMM 'de' yyyy", { locale: ptBR })
    : '';

  // Navegar para apontamento diário
  const handleApontar = (data: string) => {
    navigate(`/apontamento-diario?colaborador=${colaboradorId}&data=${data}`);
  };

  const handleVer = (data: string) => {
    navigate(`/apontamento-diario?colaborador=${colaboradorId}&data=${data}&modo=visualizar`);
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apontamento Mensal</h1>
          <p className="text-muted-foreground text-sm">
            Visão mensal de apontamentos por colaborador
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Select value={colaboradorId || '_none'} onValueChange={(v) => setColaboradorId(v === '_none' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Selecione o colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" disabled>Selecione o colaborador</SelectItem>
              {colaboradores?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                  {c.equipe && <span className="text-muted-foreground ml-2">({c.equipe})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[180px] text-center text-sm font-medium capitalize">
              <Calendar className="h-4 w-4 inline-block mr-2 text-muted-foreground" />
              {mesLabel}
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sem colaborador selecionado */}
        {!colaboradorId && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Selecione um colaborador para visualizar os apontamentos do mês
            </CardContent>
          </Card>
        )}

        {/* Conteúdo com colaborador selecionado */}
        {colaboradorId && (
          <>
            {/* Resumo */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border text-sm">
              {colaboradorSelecionado && (
                <div className="flex items-center gap-2 mr-4">
                  <CollaboratorAvatar
                    name={colaboradorSelecionado.full_name}
                    size="sm"
                  />
                  <span className="font-medium">{colaboradorSelecionado.full_name}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">{resumo.diasUteis} dias úteis</Badge>
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                  {resumo.pendentes} pendentes
                </Badge>
                <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
                  {resumo.conciliados} conciliados
                </Badge>
                {resumo.auto > 0 && (
                  <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
                    {resumo.auto} auto (férias/atestado)
                  </Badge>
                )}
              </div>
            </div>

            {/* Tabela */}
            <Card>
              <CardContent className="p-0">
                {loadingDias ? (
                  <div className="p-8 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : dias.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    Nenhum dado encontrado para este período.
                    <br />
                    <span className="text-xs">Verifique se a sincronização do Secullum está atualizada.</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Dia</TableHead>
                            <TableHead className="w-16">Dia Sem.</TableHead>
                            <TableHead className="w-24">Tipo</TableHead>
                            <TableHead className="text-right w-24">Secullum</TableHead>
                            <TableHead className="text-right w-24">Apontado</TableHead>
                            <TableHead className="text-right w-24">Pendente</TableHead>
                            <TableHead className="w-32">Status</TableHead>
                            <TableHead className="text-right w-24">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dias.map((dia) => {
                            const dateObj = parse(dia.data, 'yyyy-MM-dd', new Date());
                            const dayNum = format(dateObj, 'dd');
                            const diaSemana = DIAS_SEMANA[getDay(dateObj)];
                            const isFolga = dia.status === 'FOLGA' || isWeekend(dateObj);
                            const isAuto = dia.status === 'AUTO';
                            const isSemMarcacao = dia.status === 'SEM_MARCACAO';
                            const statusConfig = getStatusConfig(dia.status);
                            const tipoLabel = getTipoLabel(dia);

                            return (
                              <TableRow
                                key={dia.data}
                                className={cn(
                                  isFolga && 'bg-muted/30 text-muted-foreground',
                                  isAuto && 'bg-blue-50/50 dark:bg-blue-950/20',
                                  dia.status === 'PENDENTE' && 'bg-yellow-50/30 dark:bg-yellow-950/10'
                                )}
                              >
                                <TableCell className="font-medium">{dayNum}</TableCell>
                                <TableCell>{diaSemana}</TableCell>
                                <TableCell>
                                  <span className="text-xs">{tipoLabel}</span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {isFolga || isSemMarcacao ? '—' : `${dia.horasSecullum.toFixed(2)}h`}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {isFolga || isSemMarcacao ? '—' : `${dia.horasApontadas.toFixed(2)}h`}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {isFolga || isSemMarcacao ? '—' : (
                                    <span className={dia.horasPendentes > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>
                                      {dia.horasPendentes.toFixed(2)}h
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={cn('text-xs font-medium', statusConfig.className)}>
                                    {statusConfig.icon} {statusConfig.label}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {dia.status === 'PENDENTE' || dia.status === 'DIVERGENTE' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 h-7 text-xs"
                                      onClick={() => handleApontar(dia.data)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Apontar
                                    </Button>
                                  ) : dia.status === 'CONCILIADO' ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1.5 h-7 text-xs"
                                      onClick={() => handleVer(dia.data)}
                                    >
                                      <Eye className="h-3 w-3" />
                                      Ver
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Totais */}
                    <div className="border-t p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Secullum:</span>{' '}
                            <span className="font-bold">{resumo.totalSecullum.toFixed(1)}h</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Apontado:</span>{' '}
                            <span className="font-bold">{resumo.totalApontado.toFixed(1)}h</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pendente:</span>{' '}
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                              {resumo.totalPendente.toFixed(1)}h
                            </span>
                          </div>
                        </div>
                        <div className="w-full sm:w-64 flex items-center gap-3">
                          <Progress value={resumo.progresso} className="flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {resumo.progresso.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
