import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useEquipmentCatalogRequests, type CreateRequestData } from '@/hooks/orcamentos/useEquipmentCatalogRequests';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface EquipmentRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentRequestModal({ open, onOpenChange }: EquipmentRequestModalProps) {
  const { createRequest } = useEquipmentCatalogRequests();
  
  const [formData, setFormData] = useState<CreateRequestData>({
    codigo: '',
    descricao: '',
    unidade: 'mês',
    preco_mensal_ref: undefined,
    observacao: '',
  });

  const handleSubmit = async () => {
    if (!formData.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    await createRequest.mutateAsync(formData);
    
    // Reset form and close
    setFormData({
      codigo: '',
      descricao: '',
      unidade: 'mês',
      preco_mensal_ref: undefined,
      observacao: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Inclusão de Equipamento</DialogTitle>
          <DialogDescription>
            Preencha os dados do equipamento que você gostaria de adicionar ao catálogo. 
            Um administrador irá analisar sua solicitação.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="codigo">Código (opcional)</Label>
            <Input
              id="codigo"
              value={formData.codigo}
              onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
              placeholder="Ex: GUINDASTE-50T"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição completa do equipamento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                value={formData.unidade}
                onChange={(e) => setFormData(prev => ({ ...prev, unidade: e.target.value }))}
                placeholder="mês"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preco">Preço Mensal Ref. (opcional)</Label>
              <CurrencyInput
                id="preco"
                value={formData.preco_mensal_ref ?? 0}
                onValueChange={(value) => setFormData(prev => ({ ...prev, preco_mensal_ref: value || undefined }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder="Informações adicionais, justificativa, fornecedor sugerido..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createRequest.isPending || !formData.descricao.trim()}
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
