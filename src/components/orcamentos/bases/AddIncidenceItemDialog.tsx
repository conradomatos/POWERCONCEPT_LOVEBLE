import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { LaborIncidenceGroup, LaborIncidenceCalcTipo, LaborIncidenceItemInsert } from '@/hooks/orcamentos/useLaborIncidenceCatalog';

interface AddIncidenceItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: LaborIncidenceGroup | null;
  existingCodes: string[];
  onSubmit: (data: LaborIncidenceItemInsert) => Promise<void>;
  isSubmitting: boolean;
}

const CALC_TIPO_OPTIONS: { value: LaborIncidenceCalcTipo; label: string; description: string }[] = [
  { value: 'RATEIO_MESES', label: 'Rateio por Meses', description: 'Qtd × Preço ÷ Meses' },
  { value: 'MENSAL', label: 'Mensal', description: 'Qtd/Mês × Preço' },
];

export function AddIncidenceItemDialog({
  open,
  onOpenChange,
  group,
  existingCodes,
  onSubmit,
  isSubmitting,
}: AddIncidenceItemDialogProps) {
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    calc_tipo: 'RATEIO_MESES' as LaborIncidenceCalcTipo,
    preco_unitario_default: '',
    qtd_default: '',
    meses_default: '',
    qtd_mes_default: '',
    obrigatorio_default: true,
    observacao_default: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;

    const itemData: LaborIncidenceItemInsert = {
      group_id: group.id,
      codigo: formData.codigo.trim(),
      descricao: formData.descricao.trim(),
      calc_tipo: formData.calc_tipo,
      preco_unitario_default: formData.preco_unitario_default ? Number(formData.preco_unitario_default) : null,
      qtd_default: formData.qtd_default ? Number(formData.qtd_default) : null,
      meses_default: formData.meses_default ? Number(formData.meses_default) : null,
      qtd_mes_default: formData.qtd_mes_default ? Number(formData.qtd_mes_default) : null,
      obrigatorio_default: formData.obrigatorio_default,
      observacao_default: formData.observacao_default.trim() || null,
    };

    await onSubmit(itemData);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      calc_tipo: 'RATEIO_MESES',
      preco_unitario_default: '',
      qtd_default: '',
      meses_default: '',
      qtd_mes_default: '',
      obrigatorio_default: true,
      observacao_default: '',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Generate next code suggestion
  const suggestNextCode = () => {
    if (!group) return '';
    const groupCodes = existingCodes.filter(c => c.startsWith(group.codigo));
    if (groupCodes.length === 0) return `${group.codigo}1`;
    
    const numbers = groupCodes.map(c => {
      const match = c.match(new RegExp(`^${group.codigo}(\\d+)`));
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNumber = Math.max(...numbers, 0);
    return `${group.codigo}${maxNumber + 1}`;
  };

  const isRateio = formData.calc_tipo === 'RATEIO_MESES';
  const codeExists = existingCodes.includes(formData.codigo.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Novo Item de Incidência
            {group && (
              <span className="text-sm font-normal text-muted-foreground">
                — Grupo [{group.codigo}] {group.nome}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <div className="flex gap-2">
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                  placeholder={suggestNextCode()}
                  required
                  className={codeExists ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, codigo: suggestNextCode() }))}
                >
                  Auto
                </Button>
              </div>
              {codeExists && (
                <p className="text-xs text-destructive">Código já existe</p>
              )}
            </div>

            {/* Tipo de Cálculo */}
            <div className="space-y-2">
              <Label htmlFor="calc_tipo">Tipo de Cálculo *</Label>
              <Select
                value={formData.calc_tipo}
                onValueChange={(value: LaborIncidenceCalcTipo) => setFormData(prev => ({ ...prev, calc_tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALC_TIPO_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Ex: Exames Admissionais"
              required
            />
          </div>

          {/* Campos numéricos baseados no tipo de cálculo */}
          <div className="grid grid-cols-3 gap-4">
            {isRateio ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="qtd_default">Quantidade</Label>
                  <Input
                    id="qtd_default"
                    type="number"
                    step="0.01"
                    value={formData.qtd_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, qtd_default: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_unitario_default">Preço Unitário (R$)</Label>
                  <Input
                    id="preco_unitario_default"
                    type="number"
                    step="0.01"
                    value={formData.preco_unitario_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, preco_unitario_default: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meses_default">Meses (Rateio)</Label>
                  <Input
                    id="meses_default"
                    type="number"
                    step="1"
                    value={formData.meses_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, meses_default: e.target.value }))}
                    placeholder="12"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="qtd_mes_default">Qtd/Mês</Label>
                  <Input
                    id="qtd_mes_default"
                    type="number"
                    step="0.01"
                    value={formData.qtd_mes_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, qtd_mes_default: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_unitario_default">Preço Unitário (R$)</Label>
                  <Input
                    id="preco_unitario_default"
                    type="number"
                    step="0.01"
                    value={formData.preco_unitario_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, preco_unitario_default: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Meses</Label>
                  <Input disabled placeholder="-" className="bg-muted" />
                </div>
              </>
            )}
          </div>

          {/* Obrigatório toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="obrigatorio">Obrigatório por padrão</Label>
              <p className="text-xs text-muted-foreground">
                Itens obrigatórios são incluídos automaticamente no cálculo
              </p>
            </div>
            <Switch
              id="obrigatorio"
              checked={formData.obrigatorio_default}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, obrigatorio_default: checked }))}
            />
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={formData.observacao_default}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao_default: e.target.value }))}
              placeholder="Notas adicionais sobre este item..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || codeExists || !formData.codigo || !formData.descricao}>
              {isSubmitting ? 'Salvando...' : 'Criar Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
