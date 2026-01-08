import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface AlocacaoPadraoFormProps {
  colaboradorId: string;
  padraoId?: string;
  projetoId?: string;
  dataInicio?: string;
  dataFim?: string | null;
  observacao?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AlocacaoPadraoForm({
  colaboradorId,
  padraoId,
  projetoId: initialProjetoId,
  dataInicio: initialDataInicio = '',
  dataFim: initialDataFim,
  observacao: initialObservacao = '',
  onSuccess,
  onCancel,
}: AlocacaoPadraoFormProps) {
  const [projetoId, setProjetoId] = useState(initialProjetoId || '');
  const [dataInicio, setDataInicio] = useState(initialDataInicio);
  const [dataFim, setDataFim] = useState(initialDataFim || '');
  const [observacao, setObservacao] = useState(initialObservacao);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projetoOpen, setProjetoOpen] = useState(false);

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos-for-padrao'],
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

  const selectedProjeto = projetos.find((p) => p.id === projetoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projetoId || !dataInicio) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (dataFim && new Date(dataFim) < new Date(dataInicio)) {
      toast.error('Data fim deve ser maior ou igual à data início');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        colaborador_id: colaboradorId,
        projeto_id: projetoId,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        observacao: observacao || null,
      };

      if (padraoId) {
        const { error } = await supabase
          .from('alocacoes_padrao')
          .update(payload)
          .eq('id', padraoId);
        if (error) throw error;
        toast.success('Padrão atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('alocacoes_padrao')
          .insert(payload);
        if (error) throw error;
        toast.success('Padrão criado com sucesso');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving padrao:', error);
      toast.error(error.message || 'Erro ao salvar padrão');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label>Data Fim (vazio = vigente)</Label>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      </div>

      {/* Observação */}
      <div className="space-y-2">
        <Label>Observação</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações sobre este padrão..."
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
          {padraoId ? 'Atualizar' : 'Criar'} Padrão
        </Button>
      </div>
    </form>
  );
}
