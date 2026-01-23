import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Budget, BudgetFormData } from '@/lib/orcamentos/types';

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BudgetFormData) => void;
  budget?: Budget | null;
  isLoading?: boolean;
}

export function BudgetForm({
  open,
  onOpenChange,
  onSubmit,
  budget,
  isLoading,
}: BudgetFormProps) {
  const [formData, setFormData] = useState<BudgetFormData>({
    cliente_id: '',
    obra_nome: '',
    local: '',
  });

  const isEditing = !!budget;

  // Fetch clients
  const { data: clientes } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, empresa, codigo')
        .eq('status', 'ativo')
        .order('empresa');

      if (error) throw error;
      return data || [];
    },
  });

  // Reset form when budget changes
  useEffect(() => {
    if (budget) {
      setFormData({
        budget_number: budget.budget_number,
        cliente_id: budget.cliente_id,
        obra_nome: budget.obra_nome,
        local: budget.local || '',
      });
    } else {
      setFormData({
        cliente_id: '',
        obra_nome: '',
        local: '',
      });
    }
  }, [budget, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing && (
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={formData.budget_number || ''} disabled />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente *</Label>
            <Select
              value={formData.cliente_id}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, cliente_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes?.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.codigo} - {cliente.empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obra_nome">Nome da Obra *</Label>
            <Input
              id="obra_nome"
              value={formData.obra_nome}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, obra_nome: e.target.value }))
              }
              placeholder="Ex: Ampliação Subestação"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              value={formData.local || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, local: e.target.value }))
              }
              placeholder="Ex: Cubatão - SP"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.cliente_id || !formData.obra_nome}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Orçamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
