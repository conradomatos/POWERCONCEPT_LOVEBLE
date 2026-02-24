import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DespesaDeslocamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  despesa?: any | null;
  onSuccess: () => void;
}

interface FormData {
  veiculo_id: string;
  colaborador_id: string;
  projeto_id: string;
  tipo: string;
  valor: number;
  descricao: string;
  comprovante_url: string;
  data_despesa: string;
}

const TIPO_LABELS: Record<string, string> = {
  pedagio: 'Pedágio',
  estacionamento: 'Estacionamento',
  lavagem: 'Lavagem',
  outro: 'Outro',
};

export default function DespesaDeslocamentoForm({ open, onOpenChange, despesa, onSuccess }: DespesaDeslocamentoFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      veiculo_id: '',
      colaborador_id: '',
      projeto_id: '',
      tipo: 'pedagio',
      valor: 0,
      descricao: '',
      comprovante_url: '',
      data_despesa: new Date().toISOString().slice(0, 10),
    },
  });

  const veiculoId = watch('veiculo_id');
  const colaboradorId = watch('colaborador_id');
  const projetoId = watch('projeto_id');
  const tipo = watch('tipo');
  const valor = watch('valor');

  const { data: veiculos } = useQuery({
    queryKey: ['veiculos-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, apelido')
        .eq('status', 'ativo')
        .order('placa');
      if (error) throw error;
      return data;
    },
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['collaborators-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name')
        .eq('status', 'ativo')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: projetos } = useQuery({
    queryKey: ['projetos-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      if (despesa) {
        reset({
          veiculo_id: despesa.veiculo_id || '',
          colaborador_id: despesa.colaborador_id || '',
          projeto_id: despesa.projeto_id || '',
          tipo: despesa.tipo || 'pedagio',
          valor: despesa.valor || 0,
          descricao: despesa.descricao || '',
          comprovante_url: despesa.comprovante_url || '',
          data_despesa: despesa.data_despesa
            ? despesa.data_despesa.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        });
      } else {
        reset({
          veiculo_id: '',
          colaborador_id: '',
          projeto_id: '',
          tipo: 'pedagio',
          valor: 0,
          descricao: '',
          comprovante_url: '',
          data_despesa: new Date().toISOString().slice(0, 10),
        });
      }
    }
  }, [despesa, open, reset]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      veiculo_id: data.veiculo_id,
      colaborador_id: data.colaborador_id,
      projeto_id: data.projeto_id,
      tipo: data.tipo,
      valor: data.valor || 0,
      descricao: data.descricao.trim() || null,
      comprovante_url: data.comprovante_url.trim() || null,
      data_despesa: data.data_despesa || null,
    };

    try {
      if (despesa) {
        const { error } = await supabase
          .from('despesas_deslocamento')
          .update(payload)
          .eq('id', despesa.id);
        if (error) throw error;
        toast.success('Despesa atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('despesas_deslocamento')
          .insert(payload);
        if (error) throw error;
        toast.success('Despesa cadastrada com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar despesa: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{despesa ? 'Editar Despesa' : 'Nova Despesa de Deslocamento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Veículo */}
          <div className="space-y-2">
            <Label>Veículo *</Label>
            <Select value={veiculoId} onValueChange={(v) => setValue('veiculo_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo..." />
              </SelectTrigger>
              <SelectContent>
                {veiculos?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.placa} {v.apelido ? `- ${v.apelido}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.veiculo_id && <p className="text-sm text-destructive">{errors.veiculo_id.message}</p>}
            <input type="hidden" {...register('veiculo_id', { required: 'Veículo é obrigatório' })} />
          </div>

          {/* Colaborador e Projeto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={colaboradorId} onValueChange={(v) => setValue('colaborador_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.colaborador_id && <p className="text-sm text-destructive">{errors.colaborador_id.message}</p>}
              <input type="hidden" {...register('colaborador_id', { required: 'Colaborador é obrigatório' })} />
            </div>
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select value={projetoId} onValueChange={(v) => setValue('projeto_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {projetos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.os} - {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projeto_id && <p className="text-sm text-destructive">{errors.projeto_id.message}</p>}
              <input type="hidden" {...register('projeto_id', { required: 'Projeto é obrigatório' })} />
            </div>
          </div>

          {/* Tipo e Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setValue('tipo', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <CurrencyInput
                value={valor}
                onValueChange={(v) => setValue('valor', v)}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Ex: Pedágio BR-101"
              {...register('descricao')}
            />
          </div>

          {/* Data e Comprovante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_despesa">Data *</Label>
              <Input
                id="data_despesa"
                type="date"
                {...register('data_despesa', { required: 'Data é obrigatória' })}
              />
              {errors.data_despesa && <p className="text-sm text-destructive">{errors.data_despesa.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprovante_url">Comprovante (URL)</Label>
              <Input
                id="comprovante_url"
                placeholder="https://..."
                {...register('comprovante_url')}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TIPO_LABELS as DESPESA_TIPO_LABELS };
