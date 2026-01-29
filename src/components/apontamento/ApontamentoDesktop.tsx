import { useState, useEffect } from 'react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  Users,
  Plus,
  Trash2,
  ChevronsUpDown
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
  
  // Add form state
  const [projetoDropdownOpen, setProjetoDropdownOpen] = useState(false);
  const [selectedProjetoId, setSelectedProjetoId] = useState<string | null>(null);
  const [addHoras, setAddHoras] = useState<string>('');
  const [addDescricao, setAddDescricao] = useState<string>('');
  const [showAddDescricao, setShowAddDescricao] = useState(false);

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
    lancamentosDoDia,
    projetosDisponiveis,
    totalHoras,
    isLoading,
    hasChanges,
    addItem,
    removeItem,
    setHoras,
    setDescricao,
    saveBatch,
    isProjectSaved,
  } = useApontamentoSimplificado(primaryColaboradorId, dataStr);

  // Get selected project details
  const selectedProjeto = projetosDisponiveis.find(p => p.id === selectedProjetoId);

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

  const handleAddItem = () => {
    if (!selectedProjetoId || !addHoras) return;
    
    const horas = parseFloat(addHoras.replace(',', '.'));
    if (isNaN(horas) || horas <= 0) return;
    
    addItem(selectedProjetoId, horas, addDescricao || null);
    
    // Reset form
    setSelectedProjetoId(null);
    setAddHoras('');
    setAddDescricao('');
    setShowAddDescricao(false);
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

        {/* Add Entry Form */}
        {primaryColaboradorId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adicionar Lançamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Project Dropdown */}
                <div className="flex-1">
                  <Popover open={projetoDropdownOpen} onOpenChange={setProjetoDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={projetoDropdownOpen}
                        className="w-full justify-between"
                      >
                        {selectedProjeto 
                          ? `${selectedProjeto.os} - ${selectedProjeto.nome}`
                          : "Selecione o projeto..."
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar projeto..." />
                        <CommandList>
                          <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                          <CommandGroup>
                            {projetosDisponiveis.map((projeto) => (
                              <CommandItem
                                key={projeto.id}
                                value={`${projeto.os} ${projeto.nome}`}
                                onSelect={() => {
                                  setSelectedProjetoId(projeto.id);
                                  setProjetoDropdownOpen(false);
                                }}
                              >
                                <span className="text-muted-foreground mr-2 font-mono text-sm">
                                  {projeto.os}
                                </span>
                                <span className="truncate">{projeto.nome}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Hours Input */}
                <div className="w-24">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Horas"
                    value={addHoras}
                    onChange={(e) => setAddHoras(e.target.value)}
                    className="text-center"
                  />
                </div>

                {/* Note Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddDescricao(!showAddDescricao)}
                  className={cn(showAddDescricao && 'text-primary')}
                >
                  <FileText className="h-4 w-4" />
                </Button>

                {/* Add Button */}
                <Button
                  onClick={handleAddItem}
                  disabled={!selectedProjetoId || !addHoras}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {/* Description field (expandable) */}
              {showAddDescricao && (
                <Textarea
                  value={addDescricao}
                  onChange={(e) => setAddDescricao(e.target.value)}
                  placeholder="Adicione uma nota ou descrição..."
                  className="min-h-[60px]"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Entries Table */}
        {primaryColaboradorId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lançamentos do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : lancamentosDoDia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum lançamento para este dia.</p>
                  <p className="text-sm mt-1">Use o formulário acima para adicionar.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50%]">Projeto</TableHead>
                        <TableHead className="w-[100px] text-center">Horas</TableHead>
                        <TableHead className="w-[60px] text-center">Nota</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentosDoDia.map((item) => (
                        <>
                          <TableRow key={item.projeto_id}>
                            <TableCell className="font-medium">
                              <span className="text-muted-foreground mr-2 font-mono text-sm">
                                {item.projeto_os}
                              </span>
                              {item.projeto_nome}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={item.horas !== null ? String(item.horas) : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const parsed = parseFloat(val.replace(',', '.'));
                                  if (val === '') {
                                    setHoras(item.projeto_id, null);
                                  } else if (!isNaN(parsed)) {
                                    setHoras(item.projeto_id, parsed);
                                  }
                                }}
                                placeholder="0"
                                className="w-20 h-9 text-center"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleDescription(item.projeto_id)}
                                className={cn(item.descricao && 'text-primary')}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              {isProjectSaved(item.projeto_id) && (
                                <Check className="h-4 w-4 text-emerald-500" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.projeto_id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedDescriptions.has(item.projeto_id) && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-muted/30">
                                <Textarea
                                  value={item.descricao || ''}
                                  onChange={(e) => setDescricao(item.projeto_id, e.target.value || null)}
                                  placeholder="Adicione uma nota ou descrição..."
                                  className="min-h-[60px]"
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
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
      </div>
    </Layout>
  );
}
