import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCNPJ, cleanCNPJ, validateCNPJ } from '@/lib/cnpj';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Empresa = Database['public']['Tables']['empresas']['Row'];
type EmpresaInsert = Database['public']['Tables']['empresas']['Insert'];

interface EmpresaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: Empresa | null;
  onSuccess: (createdEmpresa?: Empresa) => void;
  isInline?: boolean; // When used inside project form
}

const SEGMENTOS = [
  'MADEIRA',
  'PAPEL E CELULOSE',
  'MINERAÇÃO',
  'ENERGIA',
  'AGRONEGÓCIO',
  'INFRAESTRUTURA',
  'INDÚSTRIA',
  'SERVIÇOS',
  'OUTROS',
];

export default function EmpresaForm({ open, onOpenChange, empresa, onSuccess, isInline = false }: EmpresaFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empresa: '',
    razao_social: '',
    codigo: '',
    cnpj: '',
    segmento: '',
    unidade: '',
    status: 'ativo' as 'ativo' | 'inativo',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (empresa) {
      setFormData({
        empresa: empresa.empresa,
        razao_social: empresa.razao_social,
        codigo: empresa.codigo,
        cnpj: empresa.cnpj ? formatCNPJ(empresa.cnpj) : '',
        segmento: empresa.segmento,
        unidade: empresa.unidade,
        status: empresa.status,
      });
    } else {
      setFormData({
        empresa: '',
        razao_social: '',
        codigo: '',
        cnpj: '',
        segmento: '',
        unidade: '',
        status: 'ativo',
      });
    }
    setErrors({});
  }, [empresa, open]);

  const handleCNPJChange = (value: string) => {
    const cleaned = cleanCNPJ(value);
    if (cleaned.length <= 14) {
      setFormData({ ...formData, cnpj: cleaned.length > 0 ? formatCNPJ(cleaned) : '' });
    }
  };

  const handleCodigoChange = (value: string) => {
    // Allow only letters, max 3 chars, always uppercase
    const cleaned = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
    setFormData({ ...formData, codigo: cleaned });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.empresa.trim()) {
      newErrors.empresa = 'Nome do cliente é obrigatório';
    }
    if (!formData.razao_social.trim()) {
      newErrors.razao_social = 'Razão Social é obrigatória';
    }
    if (!formData.codigo.trim()) {
      newErrors.codigo = 'Código é obrigatório';
    } else if (formData.codigo.length > 3) {
      newErrors.codigo = 'Código deve ter no máximo 3 letras';
    } else if (!/^[A-Z]+$/.test(formData.codigo)) {
      newErrors.codigo = 'Código deve conter apenas letras';
    }
    if (formData.cnpj && !validateCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }
    if (!formData.segmento) {
      newErrors.segmento = 'Segmento é obrigatório';
    }
    if (!formData.unidade.trim()) {
      newErrors.unidade = 'Unidade é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const dataToSave: EmpresaInsert = {
        empresa: formData.empresa.trim(),
        razao_social: formData.razao_social.trim(),
        codigo: formData.codigo.trim().toUpperCase(),
        cnpj: formData.cnpj ? cleanCNPJ(formData.cnpj) : null,
        segmento: formData.segmento,
        unidade: formData.unidade.trim(),
        status: 'ativo', // Always create as active
      };

      if (empresa) {
        // Update existing
        const { data, error } = await supabase
          .from('empresas')
          .update({ ...dataToSave, status: formData.status })
          .eq('id', empresa.id)
          .select()
          .single();

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
        onSuccess(data);
      } else {
        // Create new
        const { data, error } = await supabase
          .from('empresas')
          .insert(dataToSave)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            setErrors({ codigo: 'Este código já está em uso' });
            return;
          }
          throw error;
        }
        toast.success('Cliente criado com sucesso!');
        onSuccess(data);
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving empresa:', error);
      toast.error('Erro ao salvar cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{empresa ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Nome do Cliente *</Label>
            <Input
              id="empresa"
              value={formData.empresa}
              onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              placeholder="Nome curto (ex: BRASPINE)"
            />
            {errors.empresa && <p className="text-sm text-destructive">{errors.empresa}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="razao_social">Razão Social *</Label>
            <Input
              id="razao_social"
              value={formData.razao_social}
              onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              placeholder="Razão social completa"
            />
            {errors.razao_social && <p className="text-sm text-destructive">{errors.razao_social}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código * (3 letras)</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleCodigoChange(e.target.value)}
                placeholder="Ex: BRP"
                maxLength={3}
                className="uppercase"
              />
              {errors.codigo && <p className="text-sm text-destructive">{errors.codigo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
              {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento *</Label>
              <Select
                value={formData.segmento}
                onValueChange={(value) => setFormData({ ...formData, segmento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTOS.map((seg) => (
                    <SelectItem key={seg} value={seg}>
                      {seg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.segmento && <p className="text-sm text-destructive">{errors.segmento}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Input
                id="unidade"
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                placeholder="Ex: JAGUARIAIVA"
              />
              {errors.unidade && <p className="text-sm text-destructive">{errors.unidade}</p>}
            </div>
          </div>

          {/* Only show status when editing an existing client (not inline/new) */}
          {empresa && !isInline && (
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'ativo' | 'inativo') => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
