import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, ChevronsUpDown, Plus, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import EmpresaForm from './EmpresaForm';
import type { Database } from '@/integrations/supabase/types';

type Projeto = Database['public']['Tables']['projetos']['Row'];
type ProjetoInsert = Database['public']['Tables']['projetos']['Insert'];
type Empresa = Database['public']['Tables']['empresas']['Row'];

type ProjetoWithEmpresa = Projeto & {
  empresas: Pick<Empresa, 'empresa' | 'codigo' | 'unidade'> | null;
};

interface ProjetoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projeto?: ProjetoWithEmpresa | null;
  onSuccess: () => void;
}

export default function ProjetoForm({ open, onOpenChange, projeto, onSuccess }: ProjetoFormProps) {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empresaComboOpen, setEmpresaComboOpen] = useState(false);
  const [empresaFormOpen, setEmpresaFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    empresa_id: '',
    status: 'ativo',
    os: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: empresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('empresa');

      if (error) throw error;
      return data as Empresa[];
    },
  });

  // Filter only active empresas for new projects, but allow current empresa for editing
  const availableEmpresas = empresas?.filter(
    (emp) => emp.status === 'ativo' || emp.id === projeto?.empresa_id
  );

  useEffect(() => {
    if (projeto) {
      setFormData({
        nome: projeto.nome,
        descricao: projeto.descricao || '',
        empresa_id: projeto.empresa_id,
        status: projeto.status,
        os: projeto.os,
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
        empresa_id: '',
        status: 'ativo',
        os: '',
      });
    }
    setErrors({});
  }, [projeto, open]);

  const selectedEmpresa = empresas?.find((e) => e.id === formData.empresa_id);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (!formData.empresa_id) {
      newErrors.empresa_id = 'Empresa é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (projeto) {
        // Update - include OS only if super_admin changed it
        const updateData: any = {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          empresa_id: formData.empresa_id,
          status: formData.status,
        };
        
        // Only include OS in update if user is super_admin and it was changed
        if (isSuperAdmin() && formData.os !== projeto.os) {
          updateData.os = formData.os.trim();
        }

        const { error } = await supabase
          .from('projetos')
          .update(updateData)
          .eq('id', projeto.id);

        if (error) throw error;
        toast.success('Projeto atualizado com sucesso!');
      } else {
        // Create - generate new OS
        const { data: nextOs } = await supabase.rpc('generate_next_os');
        
        const { error } = await supabase
          .from('projetos')
          .insert({
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
            empresa_id: formData.empresa_id,
            status: formData.status,
            os: nextOs || '0001',
          });

        if (error) throw error;
        toast.success('Projeto criado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving projeto:', error);
      toast.error('Erro ao salvar projeto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['empresas'] });
    setEmpresaFormOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{projeto ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* OS Field - only shown when editing */}
            {projeto && (
              <div className="space-y-2">
                <Label htmlFor="os" className="flex items-center gap-2">
                  OS (Ordem de Serviço)
                  {!isSuperAdmin() && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Somente Admin Master pode alterar a OS</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Label>
                <Input
                  id="os"
                  value={formData.os}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                  disabled={!isSuperAdmin()}
                  className={cn(!isSuperAdmin() && "bg-muted cursor-not-allowed")}
                />
                {!isSuperAdmin() && (
                  <p className="text-xs text-muted-foreground">
                    Somente Admin Master pode alterar a OS
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Projeto *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do projeto"
              />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Popover open={empresaComboOpen} onOpenChange={setEmpresaComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={empresaComboOpen}
                    className="w-full justify-between"
                  >
                    {selectedEmpresa
                      ? `${selectedEmpresa.codigo} - ${selectedEmpresa.empresa} - ${selectedEmpresa.unidade}`
                      : 'Selecione uma empresa...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar empresa..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                      <CommandGroup>
                        {availableEmpresas?.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.codigo} ${emp.empresa} ${emp.unidade}`}
                            onSelect={() => {
                              setFormData({ ...formData, empresa_id: emp.id });
                              setEmpresaComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.empresa_id === emp.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="font-mono text-sm mr-2">{emp.codigo}</span>
                            <span>{emp.empresa}</span>
                            <span className="text-muted-foreground ml-2">- {emp.unidade}</span>
                            {emp.status === 'inativo' && (
                              <span className="ml-auto text-xs text-muted-foreground">(Inativo)</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setEmpresaComboOpen(false);
                            setEmpresaFormOpen(true);
                          }}
                          className="text-primary"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Nova Empresa
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.empresa_id && <p className="text-sm text-destructive">{errors.empresa_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do projeto"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
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

      <EmpresaForm
        open={empresaFormOpen}
        onOpenChange={setEmpresaFormOpen}
        onSuccess={handleEmpresaCreated}
      />
    </>
  );
}
