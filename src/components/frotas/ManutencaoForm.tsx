import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ManutencaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manutencao?: any | null;
  onSuccess: () => void;
}

interface FormData {
  veiculo_id: string;
  tipo: string;
  descricao: string;
  km_previsto: string;
  km_realizado: string;
  valor: number;
  fornecedor: string;
  status: string;
  data_prevista: string;
  data_realizada: string;
  comprovante_url: string;
}

const TIPO_LABELS: Record<string, string> = {
  troca_oleo: 'Troca de Óleo',
  pneus: 'Pneus',
  revisao: 'Revisão',
  freios: 'Freios',
  correia: 'Correia',
  filtros: 'Filtros',
  outro: 'Outro',
};

export default function ManutencaoForm({ open, onOpenChange, manutencao, onSuccess }: ManutencaoFormProps) {
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
      tipo: '',
      descricao: '',
      km_previsto: '',
      km_realizado: '',
      valor: 0,
      fornecedor: '',
      status: 'programada',
      data_prevista: '',
      data_realizada: '',
      comprovante_url: '',
    },
  });

  const veiculoId = watch('veiculo_id');
  const tipo = watch('tipo');
  const statusValue = watch('status');
  const valor = watch('valor');

  const isConcluida = statusValue === 'concluida';

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

  useEffect(() => {
    if (open) {
      if (manutencao) {
        reset({
          veiculo_id: manutencao.veiculo_id || '',
          tipo: manutencao.tipo || '',
          descricao: manutencao.descricao || '',
          km_previsto: manutencao.km_previsto?.toString() || '',
          km_realizado: manutencao.km_realizado?.toString() || '',
          valor: manutencao.valor || 0,
          fornecedor: manutencao.fornecedor || '',
          status: manutencao.status || 'programada',
          data_prevista: manutencao.data_prevista || '',
          data_realizada: manutencao.data_realizada || '',
          comprovante_url: manutencao.comprovante_url || '',
        });
      } else {
        reset({
          veiculo_id: '',
          tipo: '',
          descricao: '',
          km_previsto: '',
          km_realizado: '',
          valor: 0,
          fornecedor: '',
          status: 'programada',
          data_prevista: '',
          data_realizada: '',
          comprovante_url: '',
        });
      }
    }
  }, [manutencao, open, reset]);

  const onSubmit = async (data: FormData) => {
    if (data.status === 'concluida') {
      if (!data.km_realizado) {
        toast.error('KM Realizado é obrigatório quando a manutenção é concluída.');
        return;
      }
      if (!data.data_realizada) {
        toast.error('Data Realizada é obrigatória quando a manutenção é concluída.');
        return;
      }
    }

    const payload = {
      veiculo_id: data.veiculo_id,
      tipo: data.tipo,
      descricao: data.descricao.trim() || null,
      km_previsto: data.km_previsto ? parseInt(data.km_previsto) : null,
      km_realizado: data.km_realizado ? parseInt(data.km_realizado) : null,
      valor: data.valor || null,
      fornecedor: data.fornecedor.trim() || null,
      status: data.status,
      data_prevista: data.data_prevista || null,
      data_realizada: data.data_realizada || null,
      comprovante_url: data.comprovante_url.trim() || null,
    };

    try {
      if (manutencao) {
        const { error } = await supabase
          .from('manutencoes')
          .update(payload)
          .eq('id', manutencao.id);
        if (error) throw error;
        toast.success('Manutenção atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('manutencoes')
          .insert(payload);
        if (error) throw error;
        toast.success('Manutenção cadastrada com sucesso!');
      }

      // Se concluída, atualizar plano_manutencao
      if (data.status === 'concluida' && data.km_realizado && data.data_realizada) {
        const { error: planoError } = await supabase
          .from('plano_manutencao')
          .update({
            ultimo_km: parseInt(data.km_realizado),
            ultima_data: data.data_realizada,
          })
          .eq('veiculo_id', data.veiculo_id)
          .eq('tipo', data.tipo);

        if (planoError) {
          console.error('Erro ao atualizar plano de manutenção:', planoError);
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar manutenção: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{manutencao ? 'Editar Manutenção' : 'Nova Manutenção'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Veículo e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Veículo *</Label>
              <Select
                value={veiculoId}
                onValueChange={(v) => setValue('veiculo_id', v)}
              >
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
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setValue('tipo', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
              <input type="hidden" {...register('tipo', { required: 'Tipo é obrigatório' })} />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Detalhes da manutenção..."
              {...register('descricao')}
              rows={3}
            />
          </div>

          {/* KM Previsto e KM Realizado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="km_previsto">KM Previsto</Label>
              <Input
                id="km_previsto"
                type="number"
                placeholder="Ex: 50000"
                {...register('km_previsto')}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_realizado">
                KM Realizado {isConcluida && '*'}
              </Label>
              <Input
                id="km_realizado"
                type="number"
                placeholder="Ex: 49800"
                {...register('km_realizado')}
                min={0}
              />
            </div>
          </div>

          {/* Valor e Fornecedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <CurrencyInput
                value={valor}
                onValueChange={(v) => setValue('valor', v)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                placeholder="Ex: Oficina Central"
                {...register('fornecedor')}
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusValue}
                onValueChange={(v) => setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programada">Programada</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_prevista">Data Prevista</Label>
              <Input
                id="data_prevista"
                type="date"
                {...register('data_prevista')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_realizada">
                Data Realizada {isConcluida && '*'}
              </Label>
              <Input
                id="data_realizada"
                type="date"
                {...register('data_realizada')}
              />
            </div>
          </div>

          {/* Comprovante */}
          <div className="space-y-2">
            <Label htmlFor="comprovante_url">Comprovante (URL)</Label>
            <Input
              id="comprovante_url"
              placeholder="https://..."
              {...register('comprovante_url')}
            />
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

export { TIPO_LABELS };
