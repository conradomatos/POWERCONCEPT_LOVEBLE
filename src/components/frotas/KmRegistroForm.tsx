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

interface KmRegistroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registro?: any | null;
  onSuccess: () => void;
}

interface FormData {
  veiculo_id: string;
  colaborador_id: string;
  projeto_id: string;
  tipo: string;
  km_registrado: string;
  foto_odometro_url: string;
  data_registro: string;
}

export default function KmRegistroForm({ open, onOpenChange, registro, onSuccess }: KmRegistroFormProps) {
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
      tipo: '',
      km_registrado: '',
      foto_odometro_url: '',
      data_registro: new Date().toISOString().slice(0, 16),
    },
  });

  const veiculoId = watch('veiculo_id');
  const colaboradorId = watch('colaborador_id');
  const projetoId = watch('projeto_id');
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
        .eq('status', 'ativo')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      if (registro) {
        reset({
          veiculo_id: registro.veiculo_id || '',
          colaborador_id: registro.colaborador_id || '',
          projeto_id: registro.projeto_id || '',
          tipo: registro.tipo || '',
          km_registrado: registro.km_registrado?.toString() || '',
          foto_odometro_url: registro.foto_odometro_url || '',
          data_registro: registro.data_registro
            ? new Date(registro.data_registro).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        });
      } else {
        reset({
          veiculo_id: '',
          colaborador_id: '',
          projeto_id: '',
          tipo: '',
          km_registrado: '',
          foto_odometro_url: '',
          data_registro: new Date().toISOString().slice(0, 16),
        });
      }
    }
  }, [registro, open, reset]);

  const onSubmit = async (data: FormData) => {
    const kmRegistrado = parseInt(data.km_registrado);
    let kmCalculado: number | null = null;

    // Se tipo = volta, calcular km_calculado
    if (data.tipo === 'volta') {
      const dataRegistro = new Date(data.data_registro);
      const inicioDia = new Date(dataRegistro);
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date(dataRegistro);
      fimDia.setHours(23, 59, 59, 999);

      const { data: ultimaSaida, error: saidaError } = await supabase
        .from('registros_km')
        .select('km_registrado')
        .eq('veiculo_id', data.veiculo_id)
        .eq('tipo', 'saida')
        .gte('data_registro', inicioDia.toISOString())
        .lte('data_registro', fimDia.toISOString())
        .order('data_registro', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (saidaError) {
        toast.error('Erro ao buscar registro de saída: ' + saidaError.message);
        return;
      }

      if (ultimaSaida) {
        kmCalculado = kmRegistrado - ultimaSaida.km_registrado;
        if (kmCalculado < 0) {
          toast.error('KM registrado na volta é menor que o KM da saída. Verifique os valores.');
          return;
        }
      }
    }

    const payload = {
      veiculo_id: data.veiculo_id,
      colaborador_id: data.colaborador_id,
      projeto_id: data.projeto_id,
      tipo: data.tipo,
      km_registrado: kmRegistrado,
      km_calculado: kmCalculado,
      foto_odometro_url: data.foto_odometro_url.trim() || null,
      data_registro: new Date(data.data_registro).toISOString(),
    };

    try {
      if (registro) {
        const { error } = await supabase
          .from('registros_km')
          .update(payload)
          .eq('id', registro.id);
        if (error) throw error;
        toast.success('Registro de KM atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('registros_km')
          .insert(payload);
        if (error) throw error;
        toast.success('Registro de KM cadastrado com sucesso!');
      }

      // Atualizar km_atual do veículo
      const { error: updateError } = await supabase
        .from('veiculos')
        .update({ km_atual: kmRegistrado })
        .eq('id', data.veiculo_id);

      if (updateError) {
        console.error('Erro ao atualizar km_atual do veículo:', updateError);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar registro: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{registro ? 'Editar Registro de KM' : 'Novo Registro de KM'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Veículo */}
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

          {/* Colaborador e Projeto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select
                value={colaboradorId}
                onValueChange={(v) => setValue('colaborador_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.colaborador_id && <p className="text-sm text-destructive">{errors.colaborador_id.message}</p>}
              <input type="hidden" {...register('colaborador_id', { required: 'Colaborador é obrigatório' })} />
            </div>
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select
                value={projetoId}
                onValueChange={(v) => setValue('projeto_id', v)}
              >
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

          {/* Tipo e KM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="volta">Volta</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
              <input type="hidden" {...register('tipo', { required: 'Tipo é obrigatório' })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_registrado">KM Registrado *</Label>
              <Input
                id="km_registrado"
                type="number"
                placeholder="Ex: 45230"
                {...register('km_registrado', { required: 'KM é obrigatório' })}
                min={0}
              />
              {errors.km_registrado && <p className="text-sm text-destructive">{errors.km_registrado.message}</p>}
            </div>
          </div>

          {/* Data e Foto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_registro">Data/Hora do Registro</Label>
              <Input
                id="data_registro"
                type="datetime-local"
                {...register('data_registro')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foto_odometro_url">Foto do Odômetro (URL)</Label>
              <Input
                id="foto_odometro_url"
                placeholder="https://..."
                {...register('foto_odometro_url')}
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
