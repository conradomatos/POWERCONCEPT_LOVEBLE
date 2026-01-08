import React, { useState } from 'react';
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
import { Plus, Search, Pencil, Trash2, FolderKanban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProjetoForm from '@/components/ProjetoForm';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type Projeto = Database['public']['Tables']['projetos']['Row'];
type Empresa = Database['public']['Tables']['empresas']['Row'];

type ProjetoWithEmpresa = Projeto & {
  empresas: Pick<Empresa, 'empresa' | 'codigo' | 'unidade'> | null;
};

export default function Projetos() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<ProjetoWithEmpresa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projetoToDelete, setProjetoToDelete] = useState<ProjetoWithEmpresa | null>(null);

  const canEdit = hasRole('admin') || hasRole('rh');
  const canDelete = hasRole('admin');

  const { data: projetos, isLoading } = useQuery({
    queryKey: ['projetos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          *,
          empresas (empresa, codigo, unidade)
        `)
        .order('nome');

      if (error) throw error;
      return data as ProjetoWithEmpresa[];
    },
  });

  const filteredProjetos = projetos?.filter((proj) => {
    const searchLower = search.toLowerCase();
    return (
      proj.nome.toLowerCase().includes(searchLower) ||
      proj.empresas?.empresa.toLowerCase().includes(searchLower) ||
      proj.empresas?.codigo.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (projeto: ProjetoWithEmpresa) => {
    setSelectedProjeto(projeto);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedProjeto(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!projetoToDelete) return;

    try {
      const { error } = await supabase
        .from('projetos')
        .delete()
        .eq('id', projetoToDelete.id);

      if (error) throw error;

      toast.success('Projeto excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
    } catch (error: any) {
      console.error('Error deleting projeto:', error);
      toast.error('Erro ao excluir projeto: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setProjetoToDelete(null);
    }
  };

  const confirmDelete = (projeto: ProjetoWithEmpresa) => {
    setProjetoToDelete(projeto);
    setDeleteDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FolderKanban className="h-6 w-6" />
              Projetos
            </h1>
            <p className="text-muted-foreground">
              Portfólio de projetos
            </p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou empresa..."
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
                <TableHead className="w-20">OS</TableHead>
                <TableHead>Nome do Projeto</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredProjetos?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjetos?.map((projeto: any) => (
                  <TableRow key={projeto.id}>
                    <TableCell>
                      <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                        {projeto.os}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{projeto.nome}</TableCell>
                    <TableCell>
                      {projeto.empresas ? (
                        <span>
                          <code className="bg-muted px-2 py-1 rounded text-sm mr-2">
                            {projeto.empresas.codigo}
                          </code>
                          {projeto.empresas.empresa} - {projeto.empresas.unidade}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {projeto.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={projeto.status === 'ativo' ? 'default' : 'secondary'}>
                        {projeto.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(projeto)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(projeto)}
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

      <ProjetoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projeto={selectedProjeto}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['projetos'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto "{projetoToDelete?.nome}"?
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
