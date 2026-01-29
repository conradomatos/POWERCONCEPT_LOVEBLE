import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Loader2,
  FileText,
  AlertTriangle,
  Check,
  Users
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useApontamentoSimplificado, 
  useColaboradoresAtivos,
  useMyColaborador 
} from '@/hooks/useApontamentoSimplificado';
import { cn } from '@/lib/utils';

export function ApontamentoDesktop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, hasRole } = useAuth();
  
  const colaboradorIdParam = searchParams.get('colaborador');
  const dataParam = searchParams.get('data');

  const [selectedColaboradores, setSelectedColaboradores] = useState<string[]>(
    colaboradorIdParam ? [colaboradorIdParam] : []
  );
  const [selectedDate, setSelectedDate] = useState<Date>(
    dataParam ? new Date(dataParam + 'T00:00:00') : new Date()
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const canAccess = hasRole('admin') || hasRole('rh') || hasRole('super_admin');

  // Fetch collaborators list
  const { data: colaboradores } = useColaboradoresAtivos();

  // Get own collaborator for auto-selection
  const { data: meuColaborador } = useMyColaborador(user?.id);

  // Auto-select collaborator if coming from mobile or no selection
  useEffect(() => {
    if (!colaboradorIdParam && meuColaborador && selectedColaboradores.length === 0) {
      setSelectedColaboradores([meuColaborador.id]);
    }
  }, [colaboradorIdParam, meuColaborador, selectedColaboradores.length]);

  // Use the first selected collaborator for the hook (primary view)
  const primaryColaboradorId = selectedColaboradores[0] || null;
  const dataStr = format(selectedDate, 'yyyy-MM-dd');

  const {
    projetosComHoras,
    totalHoras,
    isLoading,
    hasChanges,
    setHoras,
    setDescricao,
    saveBatch,
    isProjectSaved,
  } = useApontamentoSimplificado(primaryColaboradorId, dataStr);

  // Update URL when selection changes
  useEffect(() => {
    if (primaryColaboradorId && selectedDate) {
      const params = new URLSearchParams();
      params.set('colaborador', primaryColaboradorId);
      params.set('data', format(selectedDate, 'yyyy-MM-dd'));
      setSearchParams(params, { replace: true });
    }
  }, [primaryColaboradorId, selectedDate, setSearchParams]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSave = () => {
    if (selectedColaboradores.length > 0) {
      saveBatch.mutate(selectedColaboradores);
    }
  };

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const toggleDescription = (projetoId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(projetoId)) {
        next.delete(projetoId);
      } else {
        next.add(projetoId);
      }
      return next;
    });
  };

  // Separate real projects from overhead
  const projetosReais = projetosComHoras.filter(p => !p.is_sistema);
  const projetosOverhead = projetosComHoras.filter(p => p.is_sistema);

  if (!canAccess) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar a versão desktop.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-4 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Apontamento de Horas</h1>
          <p className="text-muted-foreground">Lance horas rapidamente para colaboradores</p>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Colaborador Select */}
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Colaborador
                </label>
                <Select 
                  value={primaryColaboradorId || ''} 
                  onValueChange={(v) => setSelectedColaboradores([v])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                        {c.equipe && (
                          <span className="text-muted-foreground ml-2">
                            ({c.equipe})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedColaboradores.length > 1 && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedColaboradores.length} colaboradores selecionados
                  </p>
                )}
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
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Hoje
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        {primaryColaboradorId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Projetos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50%]">Projeto</TableHead>
                        <TableHead className="w-[120px] text-center">Horas</TableHead>
                        <TableHead className="w-[60px] text-center">Nota</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projetosReais.map((projeto) => (
                        <>
                          <TableRow key={projeto.projeto_id}>
                            <TableCell className="font-medium">
                              <span className="text-muted-foreground mr-2">
                                {projeto.projeto_os}
                              </span>
                              {projeto.projeto_nome}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={projeto.horas !== null ? String(projeto.horas) : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const parsed = parseFloat(val.replace(',', '.'));
                                  if (val === '') {
                                    setHoras(projeto.projeto_id, null);
                                  } else if (!isNaN(parsed)) {
                                    setHoras(projeto.projeto_id, parsed);
                                  }
                                }}
                                placeholder="0"
                                className={cn(
                                  'w-20 h-9 text-center',
                                  projeto.horas && projeto.horas > 0 && 'bg-primary/5 border-primary/30'
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleDescription(projeto.projeto_id)}
                                className={cn(
                                  projeto.descricao && 'text-primary'
                                )}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              {isProjectSaved(projeto.projeto_id) && (
                                <Check className="h-4 w-4 text-emerald-500" />
                              )}
                            </TableCell>
                          </TableRow>
                          {expandedDescriptions.has(projeto.projeto_id) && (
                            <TableRow>
                              <TableCell colSpan={4} className="bg-muted/30">
                                <Textarea
                                  value={projeto.descricao || ''}
                                  onChange={(e) => setDescricao(projeto.projeto_id, e.target.value || null)}
                                  placeholder="Adicione uma nota ou descrição..."
                                  className="min-h-[60px]"
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}

                      {/* Overhead Section */}
                      {projetosOverhead.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell 
                              colSpan={4} 
                              className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"
                            >
                              Overhead / Administrativo
                            </TableCell>
                          </TableRow>
                          {projetosOverhead.map((projeto) => (
                            <>
                              <TableRow key={projeto.projeto_id}>
                                <TableCell className="font-medium">
                                  <span className="text-muted-foreground mr-2">
                                    {projeto.projeto_os}
                                  </span>
                                  {projeto.projeto_nome}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={projeto.horas !== null ? String(projeto.horas) : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const parsed = parseFloat(val.replace(',', '.'));
                                      if (val === '') {
                                        setHoras(projeto.projeto_id, null);
                                      } else if (!isNaN(parsed)) {
                                        setHoras(projeto.projeto_id, parsed);
                                      }
                                    }}
                                    placeholder="0"
                                    className={cn(
                                      'w-20 h-9 text-center',
                                      projeto.horas && projeto.horas > 0 && 'bg-primary/5 border-primary/30'
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleDescription(projeto.projeto_id)}
                                    className={cn(
                                      projeto.descricao && 'text-primary'
                                    )}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  {isProjectSaved(projeto.projeto_id) && (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                  )}
                                </TableCell>
                              </TableRow>
                              {expandedDescriptions.has(projeto.projeto_id) && (
                                <TableRow>
                                  <TableCell colSpan={4} className="bg-muted/30">
                                    <Textarea
                                      value={projeto.descricao || ''}
                                      onChange={(e) => setDescricao(projeto.projeto_id, e.target.value || null)}
                                      placeholder="Adicione uma nota ou descrição..."
                                      className="min-h-[60px]"
                                    />
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">Total:</span>
                      <span className={cn(
                        'text-2xl font-bold',
                        totalHoras > 0 ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {totalHoras}h
                      </span>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || saveBatch.isPending}
                      size="lg"
                      className="gap-2"
                    >
                      {saveBatch.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!primaryColaboradorId && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Selecione um colaborador para lançar horas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
