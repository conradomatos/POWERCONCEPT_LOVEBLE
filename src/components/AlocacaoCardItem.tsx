import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, CheckCircle2, X, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { type Block } from '@/lib/gantt-utils';

interface AlocacaoCardItemProps {
  alocacao: Block;
  color: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  isDeleting: boolean;
}

export default function AlocacaoCardItem({
  alocacao,
  color,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  canDelete,
  isDeleting,
}: AlocacaoCardItemProps) {
  const [projetoId, setProjetoId] = useState(alocacao.projeto_id);
  const [dataInicio, setDataInicio] = useState(alocacao.data_inicio);
  const [dataFim, setDataFim] = useState(alocacao.data_fim);
  const [observacao, setObservacao] = useState(alocacao.observacao || '');
  const [isSaving, setIsSaving] = useState(false);

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos-for-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os')
        .eq('status', 'ativo')
        .order('os');
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const handleSave = async () => {
    if (!projetoId || !dataInicio || !dataFim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (dataInicio > dataFim) {
      toast.error('Data início não pode ser maior que data fim');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('alocacoes_blocos')
        .update({
          projeto_id: projetoId,
          data_inicio: dataInicio,
          data_fim: dataFim,
          observacao: observacao || null,
        })
        .eq('id', alocacao.id);

      if (error) throw error;
      toast.success('Alocação atualizada');
      onSaveEdit();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const isRealized = alocacao.tipo === 'realizado';
  const isPlanejado = alocacao.tipo === 'planejado';

  if (isEditing) {
    return (
      <Card className="border-primary/50 shadow-md">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="font-semibold text-sm">Editando alocação</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Projeto</Label>
              <Select value={projetoId} onValueChange={setProjetoId}>
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
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observação</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observação opcional..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelEdit}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">
                  {alocacao.projeto_os} - {alocacao.projeto_nome}
                </span>
                {isRealized && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Realizado
                  </Badge>
                )}
                {isPlanejado && (
                  <Badge variant="outline" className="text-xs border-dashed">
                    Planejado
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {format(parseISO(alocacao.data_inicio), 'dd/MM/yyyy')} →{' '}
                {format(parseISO(alocacao.data_fim), 'dd/MM/yyyy')}
              </div>
              {alocacao.observacao && (
                <div className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                  Obs: {alocacao.observacao}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                canDelete
                  ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                  : 'text-muted-foreground cursor-not-allowed'
              )}
              onClick={canDelete ? onDelete : undefined}
              disabled={!canDelete || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
