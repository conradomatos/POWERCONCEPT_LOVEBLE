import { useEffect, useMemo } from 'react';
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

interface AbastecimentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abastecimento?: any | null;
  onSuccess: () => void;
}

interface FormData {
  veiculo_id: string;
  colaborador_id: string;
  projeto_id: string;
  km_atual: string;
  litros: string;
  valor_total: number;
  tipo_combustivel: string;
  posto_nome: string;
  posto_cnpj: string;
  posto_cidade: string;
  chave_nfce: string;
  forma_pagamento: string;
  ultimos_digitos_cartao: string;
  foto_cupom_url: string;
  data_abastecimento: string;
}

export default function AbastecimentoForm({ open, onOpenChange, abastecimento, onSuccess }: AbastecimentoFormProps) {
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
      km_atual: '',
      litros: '',
      valor_total: 0,
      tipo_combustivel: '',
      posto_nome: '',
      posto_cnpj: '',
      posto_cidade: '',
      chave_nfce: '',
      forma_pagamento: '',
      ultimos_digitos_cartao: '',
      foto_cupom_url: '',
      data_abastecimento: new Date().toISOString().slice(0, 16),
    },
  });

  const veiculoId = watch('veiculo_id');
  const colaboradorId = watch('colaborador_id');
  const projetoId = watch('projeto_id');
  const tipoCombustivel = watch('tipo_combustivel');
  const formaPagamento = watch('forma_pagamento');
  const valorTotal = watch('valor_total');
  const litros = watch('litros');
  const kmAtual = watch('km_atual');

  // Preço por litro calculado em tempo real
  const precoLitro = useMemo(() => {
    const l = parseFloat(litros);
    if (!l || l <= 0 || !valorTotal || valorTotal <= 0) return null;
    return valorTotal / l;
  }, [valorTotal, litros]);

  // Buscar último abastecimento do veículo para calcular eficiência
  const { data: ultimoAbastecimento } = useQuery({
    queryKey: ['ultimo-abastecimento', veiculoId],
    queryFn: async () => {
      if (!veiculoId) return null;
      const { data, error } = await supabase
        .from('abastecimentos')
        .select('km_atual')
        .eq('veiculo_id', veiculoId)
        .order('data_abastecimento', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!veiculoId,
  });

  // KM/Litro (eficiência) calculado
  const eficienciaKmL = useMemo(() => {
    const km = parseInt(kmAtual);
    const l = parseFloat(litros);
    if (!km || !l || l <= 0 || !ultimoAbastecimento?.km_atual) return null;
    const diff = km - ultimoAbastecimento.km_atual;
    if (diff <= 0) return null;
    return diff / l;
  }, [kmAtual, litros, ultimoAbastecimento]);

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
      if (abastecimento) {
        reset({
          veiculo_id: abastecimento.veiculo_id || '',
          colaborador_id: abastecimento.colaborador_id || '',
          projeto_id: abastecimento.projeto_id || '',
          km_atual: abastecimento.km_atual?.toString() || '',
          litros: abastecimento.litros?.toString() || '',
          valor_total: abastecimento.valor_total || 0,
          tipo_combustivel: abastecimento.tipo_combustivel || '',
          posto_nome: abastecimento.posto_nome || '',
          posto_cnpj: abastecimento.posto_cnpj || '',
          posto_cidade: abastecimento.posto_cidade || '',
          chave_nfce: abastecimento.chave_nfce || '',
          forma_pagamento: abastecimento.forma_pagamento || '',
          ultimos_digitos_cartao: abastecimento.ultimos_digitos_cartao || '',
          foto_cupom_url: abastecimento.foto_cupom_url || '',
          data_abastecimento: abastecimento.data_abastecimento
            ? new Date(abastecimento.data_abastecimento).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        });
      } else {
        reset({
          veiculo_id: '',
          colaborador_id: '',
          projeto_id: '',
          km_atual: '',
          litros: '',
          valor_total: 0,
          tipo_combustivel: '',
          posto_nome: '',
          posto_cnpj: '',
          posto_cidade: '',
          chave_nfce: '',
          forma_pagamento: '',
          ultimos_digitos_cartao: '',
          foto_cupom_url: '',
          data_abastecimento: new Date().toISOString().slice(0, 16),
        });
      }
    }
  }, [abastecimento, open, reset]);

  const formatCnpj = (value: string): string => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return clean.slice(0, 2) + '.' + clean.slice(2);
    if (clean.length <= 8) return clean.slice(0, 2) + '.' + clean.slice(2, 5) + '.' + clean.slice(5);
    if (clean.length <= 12) return clean.slice(0, 2) + '.' + clean.slice(2, 5) + '.' + clean.slice(5, 8) + '/' + clean.slice(8);
    return clean.slice(0, 2) + '.' + clean.slice(2, 5) + '.' + clean.slice(5, 8) + '/' + clean.slice(8, 12) + '-' + clean.slice(12, 14);
  };

  const onSubmit = async (data: FormData) => {
    const km = parseInt(data.km_atual);
    const l = parseFloat(data.litros);

    // Calcular preco_litro e km_por_litro
    const calculatedPrecoLitro = l > 0 && data.valor_total > 0 ? data.valor_total / l : null;
    let calculatedKmPorLitro: number | null = null;
    if (ultimoAbastecimento?.km_atual && km > 0 && l > 0) {
      const diff = km - ultimoAbastecimento.km_atual;
      if (diff > 0) calculatedKmPorLitro = parseFloat((diff / l).toFixed(2));
    }

    const payload = {
      veiculo_id: data.veiculo_id,
      colaborador_id: data.colaborador_id,
      projeto_id: data.projeto_id,
      km_atual: km || null,
      litros: l || null,
      valor_total: data.valor_total || null,
      preco_litro: calculatedPrecoLitro ? parseFloat(calculatedPrecoLitro.toFixed(3)) : null,
      km_por_litro: calculatedKmPorLitro,
      tipo_combustivel: data.tipo_combustivel || null,
      posto_nome: data.posto_nome.trim() || null,
      posto_cnpj: data.posto_cnpj.replace(/\D/g, '').trim() || null,
      posto_cidade: data.posto_cidade.trim() || null,
      chave_nfce: data.chave_nfce.trim() || null,
      forma_pagamento: data.forma_pagamento || null,
      ultimos_digitos_cartao: data.ultimos_digitos_cartao.trim() || null,
      foto_cupom_url: data.foto_cupom_url.trim() || null,
      data_abastecimento: new Date(data.data_abastecimento).toISOString(),
    };

    try {
      if (abastecimento) {
        const { error } = await supabase
          .from('abastecimentos')
          .update(payload)
          .eq('id', abastecimento.id);
        if (error) throw error;
        toast.success('Abastecimento atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('abastecimentos')
          .insert(payload);
        if (error) throw error;
        toast.success('Abastecimento cadastrado com sucesso!');
      }

      // Atualizar km_atual do veículo
      if (km > 0) {
        const { error: updateError } = await supabase
          .from('veiculos')
          .update({ km_atual: km })
          .eq('id', data.veiculo_id);
        if (updateError) {
          console.error('Erro ao atualizar km_atual do veículo:', updateError);
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar abastecimento: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{abastecimento ? 'Editar Abastecimento' : 'Novo Abastecimento'}</DialogTitle>
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

          {/* KM Atual e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="km_atual">KM Atual *</Label>
              <Input
                id="km_atual"
                type="number"
                placeholder="Ex: 45230"
                {...register('km_atual', { required: 'KM é obrigatório' })}
                min={0}
              />
              {errors.km_atual && <p className="text-sm text-destructive">{errors.km_atual.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_abastecimento">Data/Hora</Label>
              <Input
                id="data_abastecimento"
                type="datetime-local"
                {...register('data_abastecimento')}
              />
            </div>
          </div>

          {/* Litros, Valor Total, Preço/Litro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="litros">Litros *</Label>
              <Input
                id="litros"
                type="number"
                step="0.01"
                placeholder="Ex: 42.50"
                {...register('litros', { required: 'Litros é obrigatório' })}
                min={0}
              />
              {errors.litros && <p className="text-sm text-destructive">{errors.litros.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Valor Total (R$) *</Label>
              <CurrencyInput
                value={valorTotal}
                onValueChange={(v) => setValue('valor_total', v)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Preço/Litro (R$)</Label>
              <Input
                type="text"
                readOnly
                value={precoLitro ? `R$ ${precoLitro.toFixed(3)}` : '-'}
                className="bg-muted"
              />
            </div>
          </div>

          {/* Eficiência (readonly) */}
          {eficienciaKmL !== null && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Eficiência calculada: </span>
              <span className="font-semibold text-sm">{eficienciaKmL.toFixed(2)} km/l</span>
            </div>
          )}

          {/* Combustível e Forma de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo Combustível</Label>
              <Select
                value={tipoCombustivel}
                onValueChange={(v) => setValue('tipo_combustivel', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gasolina Comum">Gasolina Comum</SelectItem>
                  <SelectItem value="Gasolina Aditivada">Gasolina Aditivada</SelectItem>
                  <SelectItem value="Etanol">Etanol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Diesel S10">Diesel S10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formaPagamento}
                onValueChange={(v) => setValue('forma_pagamento', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Conta/Fiado">Conta/Fiado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Últimos dígitos do cartão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ultimos_digitos_cartao">Últimos 4 Dígitos do Cartão</Label>
              <Input
                id="ultimos_digitos_cartao"
                placeholder="Ex: 1234"
                {...register('ultimos_digitos_cartao')}
                maxLength={4}
              />
            </div>
          </div>

          {/* Dados do Posto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="posto_nome">Nome do Posto</Label>
              <Input
                id="posto_nome"
                placeholder="Ex: Posto Shell Centro"
                {...register('posto_nome')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posto_cnpj">CNPJ do Posto</Label>
              <Input
                id="posto_cnpj"
                placeholder="XX.XXX.XXX/XXXX-XX"
                {...register('posto_cnpj', {
                  onChange: (e) => {
                    e.target.value = formatCnpj(e.target.value);
                  },
                })}
                maxLength={18}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posto_cidade">Cidade do Posto</Label>
              <Input
                id="posto_cidade"
                placeholder="Ex: São Paulo"
                {...register('posto_cidade')}
              />
            </div>
          </div>

          {/* Chave NFCe e Foto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chave_nfce">Chave NFC-e (44 dígitos)</Label>
              <Input
                id="chave_nfce"
                placeholder="Chave de acesso da NFC-e"
                {...register('chave_nfce')}
                maxLength={44}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foto_cupom_url">Foto do Cupom (URL)</Label>
              <Input
                id="foto_cupom_url"
                placeholder="https://..."
                {...register('foto_cupom_url')}
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
