import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PlanoManutencaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano?: any | null;
  onSuccess: () => void;
}

interface FormData {
  veiculo_id: string;
  tipo: string;
  intervalo_km: string;
  intervalo_meses: string;
  ultimo_km: string;
  ultima_data: string;
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

export default function PlanoManutencaoForm({ open, onOpenChange, plano, onSuccess }: PlanoManutencaoFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      veiculo_id: '_padrao',
      tipo: '',
      intervalo_km: '',
      intervalo_meses: '',
      ultimo_km: '',
      ultima_data: '',
    },
  });

  const veiculoId = watch('veiculo_id');
  const tipo = watch('tipo');

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
      if (plano) {
        reset({
          veiculo_id: plano.veiculo_id || '_padrao',
          tipo: plano.tipo || '',
          intervalo_km: plano.intervalo_km?.toString() || '',
          intervalo_meses: plano.intervalo_meses?.toString() || '',
          ultimo_km: plano.ultimo_km?.toString() || '',
          ultima_data: plano.ultima_data || '',
        });
      } else {
        reset({
          veiculo_id: '_padrao',
          tipo: '',
          intervalo_km: '',
          intervalo_meses: '',
          ultimo_km: '',
          ultima_data: '',
        });
      }
    }
  }, [plano, open, reset]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      veiculo_id: data.veiculo_id === '_padrao' ? null : data.veiculo_id,
      tipo: data.tipo,
      intervalo_km: data.intervalo_km ? parseInt(data.intervalo_km) : null,
      intervalo_meses: data.intervalo_meses ? parseInt(data.intervalo_meses) : null,
      ultimo_km: data.ultimo_km ? parseInt(data.ultimo_km) : null,
      ultima_data: data.ultima_data || null,
    };

    try {
      if (plano) {
        const { error } = await supabase
          .from('plano_manutencao')
          .update(payload)
          .eq('id', plano.id);
        if (error) throw error;
        toast.success('Plano atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('plano_manutencao')
          .insert(payload);
        if (error) throw error;
        toast.success('Plano cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar plano: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plano ? 'Editar Plano' : 'Novo Plano de Manutenção'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Veículo */}
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select
              value={veiculoId}
              onValueChange={(v) => setValue('veiculo_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_padrao">Padrão (todos)</SelectItem>
                {veiculos?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.placa} {v.apelido ? `- ${v.apelido}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
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

          {/* Intervalos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intervalo_km">Intervalo KM *</Label>
              <Input
                id="intervalo_km"
                type="number"
                placeholder="Ex: 10000"
                {...register('intervalo_km', { required: 'Intervalo KM é obrigatório' })}
                min={0}
              />
              {errors.intervalo_km && <p className="text-sm text-destructive">{errors.intervalo_km.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="intervalo_meses">Intervalo Meses</Label>
              <Input
                id="intervalo_meses"
                type="number"
                placeholder="Ex: 6"
                {...register('intervalo_meses')}
                min={0}
              />
            </div>
          </div>

          {/* Último KM e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ultimo_km">Último KM</Label>
              <Input
                id="ultimo_km"
                type="number"
                placeholder="Ex: 40000"
                {...register('ultimo_km')}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ultima_data">Última Data</Label>
              <Input
                id="ultima_data"
                type="date"
                {...register('ultima_data')}
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
