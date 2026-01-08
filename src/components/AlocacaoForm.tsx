import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tables } from '@/integrations/supabase/types';

type Collaborator = Tables<'collaborators'>;

interface AlocacaoFormProps {
  colaboradorId?: string;
  projetoId?: string;
  dataInicio?: string;
  dataFim?: string;
  observacao?: string;
  alocacaoId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  defaultDataInicio?: string;
  defaultDataFim?: string;
}

export default function AlocacaoForm({
  colaboradorId: initialColaboradorId,
  projetoId: initialProjetoId,
  dataInicio: initialDataInicio,
  dataFim: initialDataFim,
  observacao: initialObservacao = '',
  alocacaoId,
  onSuccess,
  onCancel,
  defaultDataInicio,
  defaultDataFim,
}: AlocacaoFormProps) {
  const [colaboradorId, setColaboradorId] = useState(initialColaboradorId || '');
  const [projetoId, setProjetoId] = useState(initialProjetoId || '');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(
    initialDataInicio ? parseISO(initialDataInicio) : defaultDataInicio ? parseISO(defaultDataInicio) : undefined
  );
  const [dataFim, setDataFim] = useState<Date | undefined>(
    initialDataFim ? parseISO(initialDataFim) : defaultDataFim ? parseISO(defaultDataFim) : undefined
  );
  const [observacao, setObservacao] = useState(initialObservacao);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colaboradorOpen, setColaboradorOpen] = useState(false);
  const [projetoOpen, setProjetoOpen] = useState(false);
  const [dataInicioOpen, setDataInicioOpen] = useState(false);
  const [dataFimOpen, setDataFimOpen] = useState(false);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['collaborators-for-gantt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('status', 'ativo')
        .order('full_name');
      if (error) throw error;
      return data as Collaborator[];
    },
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos-for-gantt-with-os'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          id,
          nome,
          os,
          empresas (codigo, empresa)
        `)
        .eq('status', 'ativo')
        .order('os');
      if (error) throw error;
      return data;
    },
  });

  const selectedColaborador = colaboradores.find((c) => c.id === colaboradorId);
  const selectedProjeto = projetos.find((p) => p.id === projetoId);

  // Get min/max dates based on collaborator
  const minDate = selectedColaborador ? parseISO(selectedColaborador.hire_date) : undefined;
  const maxDate = selectedColaborador?.termination_date 
    ? parseISO(selectedColaborador.termination_date) 
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!colaboradorId || !projetoId || !dataInicio || !dataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (dataFim < dataInicio) {
      toast.error('Data fim deve ser maior ou igual à data início');
      return;
    }

    // Validate against collaborator dates
    if (selectedColaborador) {
      const hireDate = parseISO(selectedColaborador.hire_date);
      if (dataInicio < hireDate) {
        toast.error(`Data de início não pode ser anterior à admissão (${format(hireDate, 'dd/MM/yyyy')})`);
        return;
      }
      if (selectedColaborador.termination_date) {
        const termDate = parseISO(selectedColaborador.termination_date);
        if (dataInicio > termDate) {
          toast.error(`Data de início não pode ser posterior ao desligamento (${format(termDate, 'dd/MM/yyyy')})`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        colaborador_id: colaboradorId,
        projeto_id: projetoId,
        data_inicio: format(dataInicio, 'yyyy-MM-dd'),
        data_fim: format(dataFim, 'yyyy-MM-dd'),
        observacao: observacao || null,
      };

      if (alocacaoId) {
        const { error } = await supabase
          .from('alocacoes_blocos')
          .update(payload)
          .eq('id', alocacaoId);
        if (error) throw error;
        toast.success('Alocação atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('alocacoes_blocos')
          .insert(payload);
        if (error) throw error;
        toast.success('Alocação criada com sucesso');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving allocation:', error);
      // Parse error message for conflicts
      if (error.message?.includes('sobreposta')) {
        toast.error('Conflito: ' + error.message);
      } else {
        toast.error(error.message || 'Erro ao salvar alocação');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatProjetoDisplay = (proj: any) => {
    return `${proj.os} - ${proj.nome} - ${proj.empresas?.empresa || ''}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Colaborador */}
      <div className="space-y-2">
        <Label>Colaborador *</Label>
        <Popover open={colaboradorOpen} onOpenChange={setColaboradorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={colaboradorOpen}
              className="w-full justify-between"
              disabled={!!initialColaboradorId}
            >
              {selectedColaborador ? selectedColaborador.full_name : 'Selecione um colaborador...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 z-50" align="start">
            <Command>
              <CommandInput placeholder="Buscar colaborador..." />
              <CommandList>
                <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                <CommandGroup>
                  {colaboradores.map((col) => (
                    <CommandItem
                      key={col.id}
                      value={col.full_name}
                      onSelect={() => {
                        setColaboradorId(col.id);
                        setColaboradorOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          colaboradorId === col.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {col.full_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Projeto with OS highlight */}
      <div className="space-y-2">
        <Label>Projeto *</Label>
        <Popover open={projetoOpen} onOpenChange={setProjetoOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={projetoOpen}
              className="w-full justify-between text-left"
            >
              <span className="truncate">
                {selectedProjeto
                  ? formatProjetoDisplay(selectedProjeto)
                  : 'Selecione um projeto...'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 z-50" align="start">
            <Command>
              <CommandInput placeholder="Buscar por OS, nome ou empresa..." />
              <CommandList>
                <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                <CommandGroup>
                  {projetos.map((proj: any) => (
                    <CommandItem
                      key={proj.id}
                      value={`${proj.os} ${proj.nome} ${proj.empresas?.empresa || ''}`}
                      onSelect={() => {
                        setProjetoId(proj.id);
                        setProjetoOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 flex-shrink-0',
                          projetoId === proj.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0">
                          {proj.os}
                        </code>
                        <span className="truncate">{proj.nome}</span>
                        <span className="text-muted-foreground text-xs truncate">
                          - {proj.empresas?.empresa}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* OS highlight when selected */}
        {selectedProjeto && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground">OS:</span>
            <code className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-bold">
              {selectedProjeto.os}
            </code>
          </div>
        )}
      </div>

      {/* Datas with Calendar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data Início *</Label>
          <Popover open={dataInicioOpen} onOpenChange={setDataInicioOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dataInicio && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Selecione...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={(date) => {
                  setDataInicio(date);
                  setDataInicioOpen(false);
                }}
                disabled={(date) => {
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                locale={ptBR}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Data Fim *</Label>
          <Popover open={dataFimOpen} onOpenChange={setDataFimOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dataFim && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Selecione...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={dataFim}
                onSelect={(date) => {
                  setDataFim(date);
                  setDataFimOpen(false);
                }}
                disabled={(date) => {
                  if (dataInicio && date < dataInicio) return true;
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                locale={ptBR}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Observação */}
      <div className="space-y-2">
        <Label>Observação</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações sobre esta alocação..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {alocacaoId ? 'Atualizar' : 'Criar'} Alocação
        </Button>
      </div>
    </form>
  );
}