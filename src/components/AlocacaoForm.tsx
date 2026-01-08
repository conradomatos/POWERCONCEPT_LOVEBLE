import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Collaborator = Tables<'collaborators'>;
type Projeto = Tables<'projetos'>;

interface AlocacaoFormProps {
  colaboradorId?: string;
  projetoId?: string;
  tipo?: 'planejado' | 'realizado';
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
  tipo: initialTipo = 'planejado',
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
  const [tipo, setTipo] = useState<'planejado' | 'realizado'>(initialTipo);
  const [dataInicio, setDataInicio] = useState(initialDataInicio || defaultDataInicio || '');
  const [dataFim, setDataFim] = useState(initialDataFim || defaultDataFim || '');
  const [observacao, setObservacao] = useState(initialObservacao);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colaboradorOpen, setColaboradorOpen] = useState(false);
  const [projetoOpen, setProjetoOpen] = useState(false);

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
    queryKey: ['projetos-for-gantt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          *,
          empresas (codigo, empresa)
        `)
        .eq('status', 'ativo')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const selectedColaborador = colaboradores.find((c) => c.id === colaboradorId);
  const selectedProjeto = projetos.find((p) => p.id === projetoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!colaboradorId || !projetoId || !dataInicio || !dataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (new Date(dataFim) < new Date(dataInicio)) {
      toast.error('Data fim deve ser maior ou igual à data início');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        colaborador_id: colaboradorId,
        projeto_id: projetoId,
        tipo,
        data_inicio: dataInicio,
        data_fim: dataFim,
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
      toast.error(error.message || 'Erro ao salvar alocação');
    } finally {
      setIsSubmitting(false);
    }
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
          <PopoverContent className="w-full p-0" align="start">
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

      {/* Projeto */}
      <div className="space-y-2">
        <Label>Projeto *</Label>
        <Popover open={projetoOpen} onOpenChange={setProjetoOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={projetoOpen}
              className="w-full justify-between"
            >
              {selectedProjeto
                ? `${(selectedProjeto as any).empresas?.codigo} - ${selectedProjeto.nome}`
                : 'Selecione um projeto...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar projeto..." />
              <CommandList>
                <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                <CommandGroup>
                  {projetos.map((proj: any) => (
                    <CommandItem
                      key={proj.id}
                      value={`${proj.empresas?.codigo} ${proj.nome}`}
                      onSelect={() => {
                        setProjetoId(proj.id);
                        setProjetoOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          projetoId === proj.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {proj.empresas?.codigo} - {proj.nome}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo *</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as 'planejado' | 'realizado')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planejado">Planejado</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data Início *</Label>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Data Fim *</Label>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            required
          />
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
