import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CustoColaborador, calcularCustos, formatCurrency } from '@/lib/custos';
import { useAuth } from '@/hooks/useAuth';

interface CustoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  custo?: CustoColaborador | null;
  onSuccess: () => void;
}

export function CustoForm({ open, onOpenChange, colaboradorId, custo, onSuccess }: CustoFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salario_base: '',
    periculosidade: false,
    vale_refeicao: '',
    vale_alimentacao: '',
    vale_transporte: '',
    ajuda_custo: '',
    plano_saude: '',
    inicio_vigencia: '',
    fim_vigencia: '',
    motivo_alteracao: '',
    classificacao: '',
    observacao: '',
  });

  useEffect(() => {
    if (custo) {
      setFormData({
        salario_base: custo.salario_base?.toString() || '',
        periculosidade: custo.periculosidade || false,
        vale_refeicao: custo.vale_refeicao?.toString() || '',
        vale_alimentacao: custo.vale_alimentacao?.toString() || '',
        vale_transporte: custo.vale_transporte?.toString() || '',
        ajuda_custo: custo.ajuda_custo?.toString() || '',
        plano_saude: custo.plano_saude?.toString() || '',
        inicio_vigencia: custo.inicio_vigencia || '',
        fim_vigencia: custo.fim_vigencia || '',
        motivo_alteracao: custo.motivo_alteracao || '',
        classificacao: custo.classificacao || '',
        observacao: custo.observacao || '',
      });
    } else {
      setFormData({
        salario_base: '',
        periculosidade: false,
        vale_refeicao: '',
        vale_alimentacao: '',
        vale_transporte: '',
        ajuda_custo: '',
        plano_saude: '',
        inicio_vigencia: '',
        fim_vigencia: '',
        motivo_alteracao: '',
        classificacao: '',
        observacao: '',
      });
    }
  }, [custo, open]);

  const custosCalculados = useMemo(() => {
    return calcularCustos({
      salario_base: parseFloat(formData.salario_base) || 0,
      periculosidade: formData.periculosidade,
      vale_refeicao: parseFloat(formData.vale_refeicao) || 0,
      vale_alimentacao: parseFloat(formData.vale_alimentacao) || 0,
      vale_transporte: parseFloat(formData.vale_transporte) || 0,
      ajuda_custo: parseFloat(formData.ajuda_custo) || 0,
      plano_saude: parseFloat(formData.plano_saude) || 0,
    });
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.salario_base || parseFloat(formData.salario_base) < 0) {
      toast({ title: 'Erro', description: 'Salário base é obrigatório e deve ser positivo', variant: 'destructive' });
      return;
    }
    
    if (!formData.inicio_vigencia) {
      toast({ title: 'Erro', description: 'Data de início da vigência é obrigatória', variant: 'destructive' });
      return;
    }

    if (formData.fim_vigencia && formData.fim_vigencia < formData.inicio_vigencia) {
      toast({ title: 'Erro', description: 'Data de fim deve ser maior ou igual à data de início', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const payload = {
      colaborador_id: colaboradorId,
      salario_base: parseFloat(formData.salario_base),
      periculosidade: formData.periculosidade,
      vale_refeicao: parseFloat(formData.vale_refeicao) || 0,
      vale_alimentacao: parseFloat(formData.vale_alimentacao) || 0,
      vale_transporte: parseFloat(formData.vale_transporte) || 0,
      ajuda_custo: parseFloat(formData.ajuda_custo) || 0,
      plano_saude: parseFloat(formData.plano_saude) || 0,
      inicio_vigencia: formData.inicio_vigencia,
      fim_vigencia: formData.fim_vigencia || null,
      motivo_alteracao: formData.motivo_alteracao || null,
      classificacao: formData.classificacao || null,
      observacao: formData.observacao || null,
      updated_by: user?.id,
    };

    try {
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

  const handleNumberChange = (field: string, value: string) => {
    // Allow only numbers and decimal point
    const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setFormData(prev => ({ ...prev, [field]: cleanValue }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{custo ? 'Editar Custo' : 'Novo Custo (Nova Vigência)'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salario_base">Salário Base *</Label>
              <Input
                id="salario_base"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.salario_base}
                onChange={(e) => handleNumberChange('salario_base', e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="periculosidade"
                checked={formData.periculosidade}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, periculosidade: checked }))}
              />
              <Label htmlFor="periculosidade">Periculosidade (30%)</Label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="vale_refeicao">Vale Refeição</Label>
              <Input
                id="vale_refeicao"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.vale_refeicao}
                onChange={(e) => handleNumberChange('vale_refeicao', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vale_alimentacao">Vale Alimentação</Label>
              <Input
                id="vale_alimentacao"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.vale_alimentacao}
                onChange={(e) => handleNumberChange('vale_alimentacao', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vale_transporte">Vale Transporte</Label>
              <Input
                id="vale_transporte"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.vale_transporte}
                onChange={(e) => handleNumberChange('vale_transporte', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ajuda_custo">Ajuda de Custo</Label>
              <Input
                id="ajuda_custo"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.ajuda_custo}
                onChange={(e) => handleNumberChange('ajuda_custo', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="plano_saude">Plano de Saúde</Label>
              <Input
                id="plano_saude"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.plano_saude}
                onChange={(e) => handleNumberChange('plano_saude', e.target.value)}
              />
            </div>
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
              <Label htmlFor="fim_vigencia">Fim Vigência (vazio = vigente)</Label>
              <Input
                id="fim_vigencia"
                type="date"
                value={formData.fim_vigencia}
                onChange={(e) => setFormData(prev => ({ ...prev, fim_vigencia: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="motivo_alteracao">Motivo da Alteração</Label>
              <Input
                id="motivo_alteracao"
                value={formData.motivo_alteracao}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo_alteracao: e.target.value }))}
                placeholder="Ex: Reajuste anual"
              />
            </div>
            <div>
              <Label htmlFor="classificacao">Classificação</Label>
              <Input
                id="classificacao"
                value={formData.classificacao}
                onChange={(e) => setFormData(prev => ({ ...prev, classificacao: e.target.value }))}
                placeholder="Ex: CLT, PJ"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder="Observações adicionais..."
              rows={2}
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
