import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Loader2,
  FileText,
  Plus,
  Trash2,
  ChevronsUpDown
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApontamentoSimplificado, useMyColaborador } from '@/hooks/useApontamentoSimplificado';
import { cn } from '@/lib/utils';

export function ApontamentoMobile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Add form state
  const [projetoDropdownOpen, setProjetoDropdownOpen] = useState(false);
  const [selectedProjetoId, setSelectedProjetoId] = useState<string | null>(null);
  const [addHoras, setAddHoras] = useState<string>('');
  const [addDescricao, setAddDescricao] = useState<string>('');
  const [showAddDescricao, setShowAddDescricao] = useState(false);
  
  // Expanded descriptions for existing items
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // Get logged-in user's collaborator record
  const { data: meuColaborador, isLoading: isLoadingColaborador } = useMyColaborador(user?.id);

  const dataStr = format(selectedDate, 'yyyy-MM-dd');
  const {
    lancamentosDoDia,
    projetosDisponiveis,
    totalHoras,
    isLoading,
    hasChanges,
    isSaving,
    addItem,
    removeItem,
    setHoras,
    setDescricao,
    saveAll,
  } = useApontamentoSimplificado(meuColaborador?.id || null, dataStr);

  // Get selected project details
  const selectedProjeto = projetosDisponiveis.find(p => p.id === selectedProjetoId);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSave = () => {
    if (meuColaborador?.id) {
      saveAll();
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

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));

  if (authLoading || isLoadingColaborador) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meuColaborador) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Seu usuário não está vinculado a um colaborador.
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com o RH para configurar seu acesso.
          </p>
          <Button variant="outline" onClick={() => navigate('/')} className="mt-6">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Apontamento</h1>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center min-w-[180px]">
            <p className="font-medium">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="p-4 space-y-4">
          {/* Add Entry Form */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Adicionar lançamento:</p>
            
            {/* Project Dropdown */}
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
              <PopoverContent className="w-[calc(100vw-2rem)] p-0" align="start">
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
            
            {/* Hours + Note + Add Button Row */}
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Horas"
                value={addHoras}
                onChange={(e) => setAddHoras(e.target.value)}
                className="w-24 text-center"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddDescricao(!showAddDescricao)}
                className={cn(showAddDescricao && 'text-primary')}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={!selectedProjetoId || !addHoras}
                className="flex-1 gap-2"
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
                placeholder="Adicione uma nota..."
                className="min-h-[60px]"
              />
            )}
          </div>

          {/* Entries List */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Lançamentos do dia:
            </p>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : lancamentosDoDia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                <p>Nenhum lançamento para este dia.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lancamentosDoDia.map((item) => (
                  <div 
                    key={item.projeto_id} 
                    className="bg-card border border-border rounded-lg overflow-hidden"
                  >
                    <div className="p-3 flex items-center gap-3">
                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          <span className="text-muted-foreground font-mono mr-1">
                            {item.projeto_os}
                          </span>
                          {item.projeto_nome}
                        </p>
                        {item.descricao && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                      
                      {/* Hours Input */}
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
                        className="w-16 h-9 text-center text-sm"
                      />
                      
                      {/* Note button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleDescription(item.projeto_id)}
                        className={cn(
                          'h-9 w-9',
                          item.descricao && 'text-primary'
                        )}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      
                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.projeto_id)}
                        className="h-9 w-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Description (expandable) */}
                    {expandedDescriptions.has(item.projeto_id) && (
                      <div className="px-3 pb-3">
                        <Textarea
                          value={item.descricao || ''}
                          onChange={(e) => setDescricao(item.projeto_id, e.target.value || null)}
                          placeholder="Adicione uma nota..."
                          className="min-h-[60px]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between px-2">
          <span className="text-muted-foreground">Total do dia</span>
          <span className={cn(
            'text-xl font-bold',
            totalHoras > 0 ? 'text-primary' : 'text-muted-foreground'
          )}>
            {totalHoras}h
          </span>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="w-full h-14 text-lg font-semibold gap-2"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Salvar
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
