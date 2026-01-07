import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCPF, cleanCPF, validateCPF } from '@/lib/cpf';
import { Database } from '@/integrations/supabase/types';

type Collaborator = Database['public']['Tables']['collaborators']['Row'];
type EmployeeStatus = Database['public']['Enums']['employee_status'];

interface CollaboratorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator?: Collaborator | null;
  onSuccess: () => void;
}

export default function CollaboratorForm({
  open,
  onOpenChange,
  collaborator,
  onSuccess,
}: CollaboratorFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    birth_date: '',
    hire_date: '',
    termination_date: '',
    position: '',
    department: '',
    status: 'ativo' as EmployeeStatus,
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (collaborator) {
      setFormData({
        full_name: collaborator.full_name,
        cpf: formatCPF(collaborator.cpf),
        birth_date: collaborator.birth_date || '',
        hire_date: collaborator.hire_date,
        termination_date: collaborator.termination_date || '',
        position: collaborator.position || '',
        department: collaborator.department || '',
        status: collaborator.status,
        email: collaborator.email || '',
        phone: collaborator.phone || '',
      });
    } else {
      setFormData({
        full_name: '',
        cpf: '',
        birth_date: '',
        hire_date: '',
        termination_date: '',
        position: '',
        department: '',
        status: 'ativo',
        email: '',
        phone: '',
      });
    }
  }, [collaborator, open]);

  const handleCPFChange = (value: string) => {
    const cleaned = cleanCPF(value);
    if (cleaned.length <= 11) {
      setFormData((prev) => ({ ...prev, cpf: formatCPF(cleaned) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanedCPF = cleanCPF(formData.cpf);

    if (!validateCPF(cleanedCPF)) {
      toast.error('CPF inválido');
      setLoading(false);
      return;
    }

    const data = {
      full_name: formData.full_name,
      cpf: cleanedCPF,
      birth_date: formData.birth_date || null,
      hire_date: formData.hire_date,
      termination_date: formData.termination_date || null,
      position: formData.position || null,
      department: formData.department || null,
      status: formData.status,
      email: formData.email || null,
      phone: formData.phone || null,
    };

    if (collaborator) {
      // Update existing
      const { error } = await supabase
        .from('collaborators')
        .update({ ...data, updated_by: user?.id })
        .eq('id', collaborator.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('CPF já cadastrado para outro colaborador');
        } else {
          toast.error('Erro ao atualizar colaborador');
        }
        setLoading(false);
        return;
      }

      // Record history
      await supabase.from('collaborator_history').insert({
        collaborator_id: collaborator.id,
        changed_by: user?.id!,
        changes: { action: 'update', data },
      });

      toast.success('Colaborador atualizado!');
    } else {
      // Create new
      const { data: newCollab, error } = await supabase
        .from('collaborators')
        .insert({ ...data, created_by: user?.id, updated_by: user?.id })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('CPF já cadastrado');
        } else {
          toast.error('Erro ao criar colaborador');
        }
        setLoading(false);
        return;
      }

      // Record history
      await supabase.from('collaborator_history').insert({
        collaborator_id: newCollab.id,
        changed_by: user?.id!,
        changes: { action: 'create', data },
      });

      toast.success('Colaborador cadastrado!');
    }

    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {collaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                placeholder="000.000.000-00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, birth_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Data de admissão *</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, hire_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termination_date">Data de desligamento</Label>
              <Input
                id="termination_date"
                type="date"
                value={formData.termination_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, termination_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: EmployeeStatus) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
                  <SelectItem value="desligado">Desligado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : collaborator ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
