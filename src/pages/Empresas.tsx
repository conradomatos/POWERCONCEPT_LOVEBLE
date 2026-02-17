import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EmpresaForm from '@/components/EmpresaForm';
import { useAuth } from '@/hooks/useAuth';
import { formatCNPJ } from '@/lib/cnpj';
import type { Database } from '@/integrations/supabase/types';

type Empresa = Database['public']['Tables']['empresas']['Row'];

export default function Empresas() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);

  const canEdit = hasRole('admin') || hasRole('rh');
  const canDelete = hasRole('admin');

  const { data: empresas, isLoading } = useQuery({
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

  const filteredEmpresas = empresas?.filter((emp) => {
    const searchLower = search.toLowerCase();
    return (
      emp.empresa.toLowerCase().includes(searchLower) ||
      emp.codigo.toLowerCase().includes(searchLower) ||
      (emp.cnpj && emp.cnpj.includes(search.replace(/\D/g, ''))) ||
      emp.unidade.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedEmpresa(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!empresaToDelete) return;

    try {
      // Check if empresa has linked projects
      const { data: projetos, error: checkError } = await supabase
        .from('projetos')
        .select('id')
        .eq('empresa_id', empresaToDelete.id)
        .limit(1);

      if (checkError) throw checkError;

      if (projetos && projetos.length > 0) {
        toast.error('Cliente possui projetos vinculados. Inative ao invés de excluir.');
        setDeleteDialogOpen(false);
        setEmpresaToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', empresaToDelete.id);

      if (error) throw error;

      toast.success('Cliente excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    } catch (error: any) {
      toast.error('Erro ao excluir cliente: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setEmpresaToDelete(null);
    }
  };

  const confirmDelete = (empresa: Empresa) => {
    setEmpresaToDelete(empresa);
    setDeleteDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Clientes
            </h1>
            <p className="text-muted-foreground">
              Gerenciamento de clientes do portfólio
            </p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, código, CNPJ ou unidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Status</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredEmpresas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmpresas?.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.empresa}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{empresa.codigo}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {empresa.cnpj ? formatCNPJ(empresa.cnpj) : '-'}
                    </TableCell>
                    <TableCell>{empresa.unidade}</TableCell>
                    <TableCell>{empresa.segmento}</TableCell>
                    <TableCell>
                      <Badge variant={empresa.status === 'ativo' ? 'default' : 'secondary'}>
                        {empresa.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(empresa)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(empresa)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <EmpresaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        empresa={selectedEmpresa}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['empresas'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{empresaToDelete?.empresa}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
