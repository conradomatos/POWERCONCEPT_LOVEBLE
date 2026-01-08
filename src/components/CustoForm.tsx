import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  CustoColaborador, 
  Classificacao,
  calcularCustos, 
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyToNumber 
} from '@/lib/custos';
import { useAuth } from '@/hooks/useAuth';

interface CustoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  custo?: CustoColaborador | null;
  onSuccess: () => void;
  existingCustos?: CustoColaborador[];
}

export function CustoForm({ open, onOpenChange, colaboradorId, custo, onSuccess, existingCustos = [] }: CustoFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salario_base: '',
    periculosidade: false,
    beneficios: '',
    classificacao: '' as Classificacao | '',
    inicio_vigencia: '',
    fim_vigencia: '',
    motivo_alteracao: '',
    observacao: '',
  });

  const isPJ = formData.classificacao === 'PJ';

  // Find current active cost (fim_vigencia in future or very far date)
  const custoVigente = useMemo(() => {
    if (custo) return null; // Editing existing, don't need to close another
    const today = new Date().toISOString().split('T')[0];
    return existingCustos.find(c => 
      c.inicio_vigencia <= today && c.fim_vigencia >= today
    ) || null;
  }, [existingCustos, custo]);

  useEffect(() => {
    if (custo) {
      setFormData({
        salario_base: formatCurrencyInput((custo.salario_base * 100).toString()),
        periculosidade: custo.periculosidade || false,
        beneficios: formatCurrencyInput((custo.beneficios * 100).toString()),
        classificacao: custo.classificacao as Classificacao || 'CLT',
        inicio_vigencia: custo.inicio_vigencia || '',
        fim_vigencia: custo.fim_vigencia || '',
        motivo_alteracao: custo.motivo_alteracao || '',
        observacao: custo.observacao || '',
      });
    } else {
      setFormData({
        salario_base: '',
        periculosidade: false,
        beneficios: '',
        classificacao: '',
        inicio_vigencia: '',
        fim_vigencia: '',
        motivo_alteracao: '',
        observacao: '',
      });
    }
  }, [custo, open]);

  // When classification changes to PJ, reset periculosidade and beneficios
  useEffect(() => {
    if (formData.classificacao === 'PJ') {
      setFormData(prev => ({
        ...prev,
        periculosidade: false,
        beneficios: '0,00'
      }));
    }
  }, [formData.classificacao]);

  const custosCalculados = useMemo(() => {
    return calcularCustos({
      salario_base: parseCurrencyToNumber(formData.salario_base),
      periculosidade: formData.periculosidade,
      beneficios: parseCurrencyToNumber(formData.beneficios),
      classificacao: formData.classificacao as Classificacao || 'CLT',
    });
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    const salarioBase = parseCurrencyToNumber(formData.salario_base);
    if (!salarioBase || salarioBase < 0) {
      toast({ title: 'Erro', description: 'Salário base é obrigatório e deve ser positivo', variant: 'destructive' });
      return;
    }
    
    if (!formData.classificacao) {
      toast({ title: 'Erro', description: 'Classificação é obrigatória (CLT ou PJ)', variant: 'destructive' });
      return;
    }
    
    if (!formData.inicio_vigencia) {
      toast({ title: 'Erro', description: 'Data de início da vigência é obrigatória', variant: 'destructive' });
      return;
    }

    if (!formData.fim_vigencia) {
      toast({ title: 'Erro', description: 'Data de fim da vigência é obrigatória', variant: 'destructive' });
      return;
    }

    if (formData.fim_vigencia < formData.inicio_vigencia) {
      toast({ title: 'Erro', description: 'Data de fim deve ser maior ou igual à data de início', variant: 'destructive' });
      return;
    }

    if (!formData.motivo_alteracao.trim()) {
      toast({ title: 'Erro', description: 'Motivo da alteração é obrigatório', variant: 'destructive' });
      return;
    }

    if (!formData.observacao.trim()) {
      toast({ title: 'Erro', description: 'Observação é obrigatória', variant: 'destructive' });
      return;
    }

    // Validate against existing vigente when creating new
    if (!custo && custoVigente) {
      if (formData.inicio_vigencia <= custoVigente.inicio_vigencia) {
        toast({ 
          title: 'Erro', 
          description: `Data de início deve ser posterior a ${new Date(custoVigente.inicio_vigencia + 'T00:00:00').toLocaleDateString('pt-BR')} (início do custo vigente)`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    setLoading(true);

    const beneficiosValue = isPJ ? 0 : parseCurrencyToNumber(formData.beneficios);

    const payload = {
      colaborador_id: colaboradorId,
      salario_base: salarioBase,
      periculosidade: isPJ ? false : formData.periculosidade,
      beneficios: beneficiosValue,
      classificacao: formData.classificacao,
      inicio_vigencia: formData.inicio_vigencia,
      fim_vigencia: formData.fim_vigencia,
      motivo_alteracao: formData.motivo_alteracao,
      observacao: formData.observacao,
      updated_by: user?.id,
    };

    try {
      // If creating new and there's a vigente, close it first
      if (!custo && custoVigente) {
        const newEndDate = new Date(formData.inicio_vigencia);
        newEndDate.setDate(newEndDate.getDate() - 1);
        const fimVigenciaAtual = newEndDate.toISOString().split('T')[0];

        const { error: updateError } = await supabase
          .from('custos_colaborador')
          .update({ 
            fim_vigencia: fimVigenciaAtual,
            updated_by: user?.id 
          })
          .eq('id', custoVigente.id);

        if (updateError) throw updateError;
      }

      if (custo) {
        const { error } = await supabase
          .from('custos_colaborador')
          .update(payload)
          .eq('id', custo.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Custo atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('custos_colaborador')
          .insert({ ...payload, created_by: user?.id });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Custo cadastrado com sucesso' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const message = error.message?.includes('sobreposta') 
        ? 'Já existe um registro de custo com vigência sobreposta para este colaborador'
        : error.message || 'Erro ao salvar custo';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{custo ? 'Editar Custo' : 'Novo Custo (Nova Vigência)'}</DialogTitle>
        </DialogHeader>

        {!custo && custoVigente && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-sm">
            <strong>Atenção:</strong> Existe um custo vigente. Ao salvar, o custo atual será encerrado 
            automaticamente no dia anterior ao início desta nova vigência.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Classificação - First and required */}
          <div>
            <Label htmlFor="classificacao">Classificação *</Label>
            <Select
              value={formData.classificacao}
              onValueChange={(value: Classificacao) => setFormData(prev => ({ ...prev, classificacao: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione CLT ou PJ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLT">CLT</SelectItem>
                <SelectItem value="PJ">PJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salario_base">Salário Base *</Label>
              <Input
                id="salario_base"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={formData.salario_base}
                onChange={(e) => handleCurrencyChange('salario_base', e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="periculosidade"
                checked={formData.periculosidade}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, periculosidade: checked }))}
                disabled={isPJ}
              />
              <Label htmlFor="periculosidade" className={isPJ ? 'text-muted-foreground' : ''}>
                Periculosidade (30%) {isPJ && '(N/A para PJ)'}
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="beneficios">Benefícios *</Label>
            <Input
              id="beneficios"
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={formData.beneficios}
              onChange={(e) => handleCurrencyChange('beneficios', e.target.value)}
              disabled={isPJ}
              required
            />
            {isPJ && (
              <p className="text-xs text-muted-foreground mt-1">Não se aplica para PJ</p>
            )}
          </div>

          {/* Calculated Fields */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Cálculos Automáticos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Benefícios:</span>
                <p className="font-medium">{formatCurrency(custosCalculados.beneficios)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Adic. Periculosidade:</span>
                <p className="font-medium">{formatCurrency(custosCalculados.adicional_periculosidade)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo Mensal:</span>
                <p className="font-medium text-primary">{formatCurrency(custosCalculados.custo_mensal_total)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo/Hora:</span>
                <p className="font-medium text-primary">{formatCurrency(custosCalculados.custo_hora)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inicio_vigencia">Início Vigência *</Label>
              <Input
                id="inicio_vigencia"
                type="date"
                value={formData.inicio_vigencia}
                onChange={(e) => setFormData(prev => ({ ...prev, inicio_vigencia: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="fim_vigencia">Fim Vigência *</Label>
              <Input
                id="fim_vigencia"
                type="date"
                value={formData.fim_vigencia}
                onChange={(e) => setFormData(prev => ({ ...prev, fim_vigencia: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="motivo_alteracao">Motivo da Alteração *</Label>
            <Input
              id="motivo_alteracao"
              value={formData.motivo_alteracao}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo_alteracao: e.target.value }))}
              placeholder="Ex: Reajuste anual, Promoção, Novo contrato"
              required
            />
          </div>

          <div>
            <Label htmlFor="observacao">Observação *</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder="Observações adicionais sobre este registro de custo..."
              rows={2}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : custo ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
