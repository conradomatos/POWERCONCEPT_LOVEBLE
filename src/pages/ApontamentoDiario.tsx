import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon, Clock, Plus, Trash2, Send, Check, Lock, 
  Copy, AlertTriangle, ChevronLeft, ChevronRight, Save, PieChart
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { 
  useApontamentoDiario, 
  useProjetosDropdown, 
  TipoHoraExt, 
  ApontamentoDiaStatus 
} from '@/hooks/useApontamentoDiario';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<ApontamentoDiaStatus, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  APROVADO: 'Aprovado',
  BLOQUEADO: 'Bloqueado',
};

const STATUS_COLORS: Record<ApontamentoDiaStatus, string> = {
  RASCUNHO: 'bg-yellow-100 text-yellow-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  APROVADO: 'bg-green-100 text-green-800',
  BLOQUEADO: 'bg-gray-100 text-gray-800',
};

export default function ApontamentoDiario() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, hasRole } = useAuth();
  
  // Parse URL params
  const colaboradorIdParam = searchParams.get('colaborador');
  const dataParam = searchParams.get('data');
  
  // State
  const [selectedColaborador, setSelectedColaborador] = useState<string>(colaboradorIdParam || '');
  const [selectedDate, setSelectedDate] = useState<Date>(
    dataParam ? new Date(dataParam + 'T00:00:00') : new Date()
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // New item form
  const [newProjetoId, setNewProjetoId] = useState('');
  const [newTipoHora, setNewTipoHora] = useState<TipoHoraExt>('NORMAL');
  const [newHoras, setNewHoras] = useState('');
  const [newDescricao, setNewDescricao] = useState('');
  
  // Ref for auto-focus after adding item
  const projetoSelectRef = useRef<HTMLDivElement>(null);
  
  const canAccess = hasRole('admin') || hasRole('rh') || hasRole('super_admin');
  
  // Update URL when selection changes
  useEffect(() => {
    if (selectedColaborador && selectedDate) {
      const params = new URLSearchParams();
      params.set('colaborador', selectedColaborador);
      params.set('data', format(selectedDate, 'yyyy-MM-dd'));
      setSearchParams(params, { replace: true });
    }
  }, [selectedColaborador, selectedDate, setSearchParams]);
  
  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  
  // Fetch collaborators
  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, cpf, equipe')
        .eq('status', 'ativo')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: canAccess,
  });
  
  // Use hook for apontamento data
  const dataStr = format(selectedDate, 'yyyy-MM-dd');
  const {
    apontamentoDia,
    items,
    rateio,
    saldoHoras,
    isLoading,
    canSubmit,
    isEditable,
    createOrGetDia,
    addItem,
    updateItem,
    deleteItem,
    updateDiaStatus,
    updateHorasBase,
    updateObservacao,
    TIPO_HORA_LABELS,
  } = useApontamentoDiario(selectedColaborador, dataStr);
  
  // Projetos dropdown
  const { data: projetos } = useProjetosDropdown();
  
  // Project options - separate real and overhead
  const projetosReais = useMemo(() => 
    projetos?.filter(p => !p.is_sistema) || [], 
    [projetos]
  );
  const projetosOverhead = useMemo(() => 
    projetos?.filter(p => p.is_sistema) || [], 
    [projetos]
  );
  
  // Initialize day when collaborator and date selected
  useEffect(() => {
    if (selectedColaborador && !apontamentoDia && !isLoading) {
      createOrGetDia.mutate({ colaboradorId: selectedColaborador, data: dataStr });
    }
  }, [selectedColaborador, dataStr, apontamentoDia, isLoading]);
  
  // Handle add item
  const handleAddItem = async () => {
    if (!newProjetoId) {
      toast.error('Selecione um projeto');
      return;
    }
    const horasNum = parseFloat(newHoras.replace(',', '.'));
    if (isNaN(horasNum) || horasNum <= 0) {
      toast.error('Informe uma quantidade de horas válida');
      return;
    }
    
    const projeto = projetos?.find(p => p.id === newProjetoId);
    const isOverhead = projeto?.is_sistema || false;
    
    await addItem.mutateAsync({
      projetoId: newProjetoId,
      tipoHora: newTipoHora,
      horas: horasNum,
      descricao: newDescricao || undefined,
      isOverhead,
    });
    
    // Reset form
    setNewProjetoId('');
    setNewHoras('');
    setNewDescricao('');
    toast.success('Lançamento adicionado');
    
    // Auto-focus back to project select for rapid entry
    setTimeout(() => {
      const trigger = projetoSelectRef.current?.querySelector('button');
      trigger?.focus();
    }, 100);
  };
  
  // Handle duplicate item
  const handleDuplicate = (item: typeof items[0]) => {
    setNewProjetoId(item.projeto_id);
    setNewTipoHora(item.tipo_hora);
    setNewHoras(String(item.horas));
    setNewDescricao(item.descricao || '');
    toast.info('Dados copiados para novo lançamento');
  };
  
  // Navigate days
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  
  // Handle status changes
  const handleSubmit = () => updateDiaStatus.mutate({ status: 'ENVIADO' });
  const handleApprove = () => updateDiaStatus.mutate({ status: 'APROVADO' });
  const handleReject = () => updateDiaStatus.mutate({ status: 'RASCUNHO' });
  const handleLock = () => updateDiaStatus.mutate({ status: 'BLOQUEADO' });
  
  if (!canAccess) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Apontamento Diário</h1>
            <p className="text-muted-foreground">Lance horas por projeto/OS</p>
          </div>
        </div>

        {/* Filters: Colaborador + Date */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Colaborador Select */}
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Colaborador</label>
                <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} {c.equipe && <span className="text-muted-foreground">({c.equipe})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Navigation */}
              <div className="flex items-end gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data</label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[180px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "EEEE, dd/MM", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => {
                          if (d) {
                            setSelectedDate(d);
                            setCalendarOpen(false);
                          }
                        }}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button variant="outline" size="icon" onClick={goToNextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedColaborador && (
          <>
            {/* Day Summary Header */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-lg">
                      {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </CardTitle>
                    {apontamentoDia && (
                      <Badge className={cn("text-xs", STATUS_COLORS[apontamentoDia.status])}>
                        {STATUS_LABELS[apontamentoDia.status]}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Status Actions */}
                  <div className="flex gap-2">
                    {apontamentoDia?.status === 'RASCUNHO' && (
                      <Button 
                        onClick={handleSubmit} 
                        disabled={!canSubmit || updateDiaStatus.isPending}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Enviar para Aprovação
                      </Button>
                    )}
                    {apontamentoDia?.status === 'ENVIADO' && hasRole('admin') && (
                      <>
                        <Button variant="outline" onClick={handleReject} disabled={updateDiaStatus.isPending}>
                          Devolver
                        </Button>
                        <Button onClick={handleApprove} disabled={updateDiaStatus.isPending} className="gap-2">
                          <Check className="h-4 w-4" />
                          Aprovar
                        </Button>
                      </>
                    )}
                    {apontamentoDia?.status === 'APROVADO' && hasRole('super_admin') && (
                      <Button variant="outline" onClick={handleLock} disabled={updateDiaStatus.isPending} className="gap-2">
                        <Lock className="h-4 w-4" />
                        Bloquear
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Hours Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Base do Dia</p>
                    <div className="flex items-center gap-2">
                      {isEditable ? (
                        <Input
                          type="number"
                          value={apontamentoDia?.horas_base_dia ?? 8}
                          onChange={(e) => updateHorasBase.mutate(parseFloat(e.target.value) || 0)}
                          className="w-20 h-8"
                          step="0.5"
                        />
                      ) : (
                        <span className="text-xl font-bold">{apontamentoDia?.horas_base_dia ?? 8}h</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Apontadas</p>
                    <p className="text-xl font-bold">{apontamentoDia?.total_horas_apontadas ?? 0}h</p>
                  </div>
                  <div className={cn(
                    "rounded-lg p-3",
                    saldoHoras > 0 ? "bg-warning/10" : saldoHoras < 0 ? "bg-destructive/10" : "bg-primary/10"
                  )}>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className={cn(
                      "text-xl font-bold",
                      saldoHoras > 0 ? "text-warning" : saldoHoras < 0 ? "text-destructive" : "text-primary"
                    )}>
                      {saldoHoras > 0 ? '+' : ''}{saldoHoras.toFixed(2)}h
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Custo Total</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(items.reduce((sum, i) => sum + (i.custo_total || 0), 0))}
                    </p>
                  </div>
                </div>
                
                {/* Warning if saldo != 0 */}
                {apontamentoDia?.horas_base_dia !== null && Math.abs(saldoHoras) > 0.25 && (
                  <div className="mt-3 flex items-center gap-2 text-warning bg-warning/10 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      O total apontado ({apontamentoDia?.total_horas_apontadas}h) difere da base ({apontamentoDia?.horas_base_dia}h). 
                      Ajuste os lançamentos antes de enviar.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Lançamentos do Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Item Form */}
                {isEditable && (
                  <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1" ref={projetoSelectRef}>
                      <Select value={newProjetoId} onValueChange={setNewProjetoId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Projeto/OS" />
                        </SelectTrigger>
                        <SelectContent>
                          {projetosReais.length > 0 && (
                            <>
                              <SelectItem value="__header_reais" disabled className="font-semibold text-foreground">
                                Projetos Reais
                              </SelectItem>
                              {projetosReais.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.os} - {p.nome}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {projetosOverhead.length > 0 && (
                            <>
                              <SelectItem value="__header_overhead" disabled className="font-semibold text-foreground mt-2">
                                Overhead / Sistema
                              </SelectItem>
                              {projetosOverhead.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.os} - {p.nome}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Select value={newTipoHora} onValueChange={(v) => setNewTipoHora(v as TipoHoraExt)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_HORA_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Horas"
                        value={newHoras}
                        onChange={(e) => setNewHoras(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newProjetoId && newHoras) {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Descrição (opcional)"
                        value={newDescricao}
                        onChange={(e) => setNewDescricao(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddItem} disabled={addItem.isPending} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                )}

                {/* Items Table */}
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum lançamento neste dia</p>
                    {isEditable && <p className="text-sm">Use o formulário acima para adicionar</p>}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Projeto/OS</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        {isEditable && <TableHead className="w-20"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className={item.is_overhead ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{item.projeto?.os}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{item.projeto?.nome}</span>
                              {item.is_overhead && (
                                <Badge variant="outline" className="text-xs">Overhead</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {TIPO_HORA_LABELS[item.tipo_hora]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.horas.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {item.descricao || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.custo_total || 0)}
                          </TableCell>
                          {isEditable && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicate(item)}
                                  title="Duplicar"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteItem.mutate(item.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Rateio Summary */}
            {rateio.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Resumo do Dia (Rateio)
                  </CardTitle>
                  <CardDescription>
                    Distribuição das horas por projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rateio.map((r) => (
                      <div 
                        key={r.projeto_id} 
                        className={cn(
                          "p-3 rounded-lg border",
                          r.is_overhead ? "bg-muted/50 border-border" : "bg-card"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-mono text-sm">{r.projeto_os}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                              {r.projeto_nome}
                            </p>
                          </div>
                          <Badge variant={r.is_overhead ? "outline" : "default"}>
                            {r.percentual.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{r.horas_projeto_dia.toFixed(2)}h</span>
                          <span className="font-semibold">{formatCurrency(r.custo_projeto_dia || 0)}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              r.is_overhead ? "bg-muted-foreground" : "bg-primary"
                            )}
                            style={{ width: `${r.percentual}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Observations */}
            {(isEditable || apontamentoDia?.observacao) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditable ? (
                    <Textarea
                      placeholder="Observações sobre o dia..."
                      value={apontamentoDia?.observacao || ''}
                      onChange={(e) => updateObservacao.mutate(e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <p className="text-muted-foreground">{apontamentoDia?.observacao || 'Sem observações'}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
