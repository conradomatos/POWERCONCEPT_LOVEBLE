import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import AlocacaoPadraoForm from '@/components/AlocacaoPadraoForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Padrao {
  id: string;
  colaborador_id: string;
  projeto_id: string;
  data_inicio: string;
  data_fim: string | null;
  observacao: string | null;
  projetos: {
    nome: string;
    empresas: {
      codigo: string;
    };
  };
}

export default function CollaboratorDefaults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loading: authLoading, user, hasAnyRole, hasRole } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPadrao, setEditingPadrao] = useState<Padrao | null>(null);
  const [deletePadraoId, setDeletePadraoId] = useState<string | null>(null);

  const canEdit = hasRole('admin') || hasRole('rh');

  // Fetch collaborator
  const { data: collaborator, isLoading: loadingCollaborator } = useQuery({
    queryKey: ['collaborator', id],
    queryFn: async () => {
      if (!id) throw new Error('ID não fornecido');
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch defaults
  const { data: padroes = [], isLoading: loadingPadroes } = useQuery({
    queryKey: ['alocacoes-padrao', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('alocacoes_padrao')
        .select(`
          id,
          colaborador_id,
          projeto_id,
          data_inicio,
          data_fim,
          observacao,
          projetos (
            nome,
            empresas (codigo)
          )
        `)
        .eq('colaborador_id', id)
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data as unknown as Padrao[];
    },
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (padraoId: string) => {
      const { error } = await supabase
        .from('alocacoes_padrao')
        .delete()
        .eq('id', padraoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes-padrao', id] });
      toast.success('Padrão excluído com sucesso');
      setDeletePadraoId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir padrão');
    },
  });

  if (authLoading || loadingCollaborator) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !hasAnyRole()) {
    navigate('/auth');
    return null;
  }

  if (!collaborator) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Colaborador não encontrado</p>
          <Button variant="link" onClick={() => navigate('/collaborators')}>
            Voltar para lista
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/collaborators')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Padrões de Alocação
            </h1>
            <p className="text-muted-foreground">{collaborator.full_name}</p>
          </div>
        </div>

        {/* Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projetos Padrão</CardTitle>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingPadrao(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Padrão
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingPadroes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : padroes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum padrão cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Observação</TableHead>
                    {canEdit && <TableHead className="w-24">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {padroes.map((padrao) => (
                    <TableRow key={padrao.id}>
                      <TableCell className="font-medium">
                        {padrao.projetos.empresas.codigo} - {padrao.projetos.nome}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(padrao.data_inicio), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {padrao.data_fim
                          ? format(parseISO(padrao.data_fim), 'dd/MM/yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {padrao.observacao || '—'}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingPadrao(padrao);
                                setIsFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletePadraoId(padrao.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPadrao ? 'Editar Padrão' : 'Novo Padrão'}
              </DialogTitle>
            </DialogHeader>
            <AlocacaoPadraoForm
              colaboradorId={id!}
              padraoId={editingPadrao?.id}
              projetoId={editingPadrao?.projeto_id}
              dataInicio={editingPadrao?.data_inicio}
              dataFim={editingPadrao?.data_fim}
              observacao={editingPadrao?.observacao || ''}
              onSuccess={() => {
                setIsFormOpen(false);
                setEditingPadrao(null);
                queryClient.invalidateQueries({ queryKey: ['alocacoes-padrao', id] });
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingPadrao(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deletePadraoId} onOpenChange={() => setDeletePadraoId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este padrão? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePadraoId && deleteMutation.mutate(deletePadraoId)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
