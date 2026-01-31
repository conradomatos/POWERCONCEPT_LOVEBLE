import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import AlocacaoCardItem from '@/components/AlocacaoCardItem';
import { getProjectColor, type Block } from '@/lib/gantt-utils';

interface AlocacoesDiaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  colaboradorNome: string;
  dataClicada: Date;
  alocacoes: Block[];
  allProjectIds: string[];
  onSuccess: () => void;
  canDeleteRealized: boolean;
}

export default function AlocacoesDiaModal({
  open,
  onOpenChange,
  colaboradorId,
  colaboradorNome,
  dataClicada,
  alocacoes,
  allProjectIds,
  onSuccess,
  canDeleteRealized,
}: AlocacoesDiaModalProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add form state
  const [addProjetoId, setAddProjetoId] = useState('');
  const [addDataInicio, setAddDataInicio] = useState(format(dataClicada, 'yyyy-MM-dd'));
  const [addDataFim, setAddDataFim] = useState(format(dataClicada, 'yyyy-MM-dd'));
  const [addObservacao, setAddObservacao] = useState('');
  const [isAddingSaving, setIsAddingSaving] = useState(false);

  // Fetch projects for add form
  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos-for-add'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os')
        .eq('status', 'ativo')
        .order('os');
      if (error) throw error;
      return data;
    },
    enabled: isAdding,
  });

  const alocacaoParaExcluir = useMemo(() => {
    return alocacoes.find((a) => a.id === deleteConfirmId);
  }, [alocacoes, deleteConfirmId]);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('alocacoes_blocos')
        .delete()
        .eq('id', deleteConfirmId);
      if (error) throw error;
      toast.success('Alocação excluída');
      setDeleteConfirmId(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = () => {
    setEditingId(null);
    onSuccess();
  };

  const handleAddSave = async () => {
    if (!addProjetoId || !addDataInicio || !addDataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (addDataInicio > addDataFim) {
      toast.error('Data início não pode ser maior que data fim');
      return;
    }

    setIsAddingSaving(true);
    try {
      const { error } = await supabase.from('alocacoes_blocos').insert({
        colaborador_id: colaboradorId,
        projeto_id: addProjetoId,
        data_inicio: addDataInicio,
        data_fim: addDataFim,
        observacao: addObservacao || null,
        tipo: 'planejado',
      });

      if (error) throw error;
      toast.success('Alocação criada');
      setIsAdding(false);
      resetAddForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar alocação');
    } finally {
      setIsAddingSaving(false);
    }
  };

  const resetAddForm = () => {
    setAddProjetoId('');
    setAddDataInicio(format(dataClicada, 'yyyy-MM-dd'));
    setAddDataFim(format(dataClicada, 'yyyy-MM-dd'));
    setAddObservacao('');
  };

  const handleClose = () => {
    setEditingId(null);
    setIsAdding(false);
    resetAddForm();
    onOpenChange(false);
  };

  const formattedDate = format(dataClicada, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Alocações de {colaboradorNome}</DialogTitle>
            <DialogDescription className="capitalize">
              {formattedDate}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {alocacoes.length === 0 && !isAdding ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma alocação neste dia
                </div>
              ) : (
                alocacoes.map((alocacao) => (
                  <AlocacaoCardItem
                    key={alocacao.id}
                    alocacao={alocacao}
                    color={getProjectColor(alocacao.projeto_id, allProjectIds)}
                    isEditing={editingId === alocacao.id}
                    onEdit={() => setEditingId(alocacao.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={handleSaveEdit}
                    onDelete={() => setDeleteConfirmId(alocacao.id)}
                    canDelete={
                      alocacao.tipo === 'planejado' || canDeleteRealized
                    }
                    isDeleting={isDeleting && deleteConfirmId === alocacao.id}
                  />
                ))
              )}

              {/* Add Form */}
              {isAdding && (
                <div className="border border-primary/50 rounded-lg p-4 space-y-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Nova Alocação</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setIsAdding(false);
                        resetAddForm();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Projeto</Label>
                      <Select value={addProjetoId} onValueChange={setAddProjetoId}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione um projeto" />
                        </SelectTrigger>
                        <SelectContent>
                          {projetos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.os} - {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data Início</Label>
                        <Input
                          type="date"
                          value={addDataInicio}
                          onChange={(e) => setAddDataInicio(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data Fim</Label>
                        <Input
                          type="date"
                          value={addDataFim}
                          onChange={(e) => setAddDataFim(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Observação</Label>
                      <Textarea
                        value={addObservacao}
                        onChange={(e) => setAddObservacao(e.target.value)}
                        placeholder="Observação opcional..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAdding(false);
                        resetAddForm();
                      }}
                      disabled={isAddingSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddSave}
                      disabled={isAddingSaving}
                    >
                      {isAddingSaving && (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
            {!isAdding && (
              <Button
                variant="outline"
                onClick={() => setIsAdding(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar outro projeto
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
        title="Excluir Alocação"
        description={`Excluir alocação do projeto ${alocacaoParaExcluir?.projeto_os} - ${alocacaoParaExcluir?.projeto_nome}?`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
