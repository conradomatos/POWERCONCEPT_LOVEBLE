import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import GanttChart from '@/components/GanttChart';
import AlocacaoForm from '@/components/AlocacaoForm';
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Wand2,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, subMonths, addWeeks, subWeeks, parseISO } from 'date-fns';
import { getGanttPeriod, PeriodType } from '@/lib/gantt-utils';

interface Block {
  id: string;
  colaborador_id: string;
  projeto_id: string;
  projeto_nome: string;
  projeto_codigo: string;
  data_inicio: string;
  data_fim: string;
  tipo: 'planejado' | 'realizado';
  observacao?: string | null;
}

export default function Planejamento() {
  const { loading: authLoading, user, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [tipo, setTipo] = useState<'planejado' | 'realizado'>('planejado');
  const [search, setSearch] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState<string>('');
  const [projetoFilter, setProjetoFilter] = useState<string>('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [defaultFormData, setDefaultFormData] = useState<{
    colaboradorId?: string;
    dataInicio?: string;
    dataFim?: string;
  }>({});

  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);

  const period = useMemo(() => getGanttPeriod(currentDate, periodType), [currentDate, periodType]);

  // Fetch collaborators
  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['collaborators-gantt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, hire_date, termination_date, status')
        .eq('status', 'ativo')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch blocks for the period
  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['alocacoes-blocos', period.start.toISOString(), period.end.toISOString(), tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alocacoes_blocos')
        .select(`
          id,
          colaborador_id,
          projeto_id,
          data_inicio,
          data_fim,
          tipo,
          observacao,
          projetos (
            nome,
            empresas (codigo)
          )
        `)
        .eq('tipo', tipo)
        .lte('data_inicio', format(period.end, 'yyyy-MM-dd'))
        .gte('data_fim', format(period.start, 'yyyy-MM-dd'));

      if (error) throw error;

      return data.map((b: any) => ({
        id: b.id,
        colaborador_id: b.colaborador_id,
        projeto_id: b.projeto_id,
        data_inicio: b.data_inicio,
        data_fim: b.data_fim,
        tipo: b.tipo,
        observacao: b.observacao,
        projeto_nome: b.projetos?.nome || '',
        projeto_codigo: b.projetos?.empresas?.codigo || '',
      })) as Block[];
    },
  });

  // Fetch empresas for filter
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, codigo, empresa')
        .eq('status', 'ativo')
        .order('codigo');
      if (error) throw error;
      return data;
    },
  });

  // Fetch projetos for filter
  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos-filter', empresaFilter],
    queryFn: async () => {
      let query = supabase
        .from('projetos')
        .select('id, nome, empresa_id')
        .eq('status', 'ativo')
        .order('nome');

      if (empresaFilter) {
        query = query.eq('empresa_id', empresaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch default allocations
  const { data: defaultAllocations = [] } = useQuery({
    queryKey: ['alocacoes-padrao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alocacoes_padrao')
        .select(`
          id,
          colaborador_id,
          projeto_id,
          data_inicio,
          data_fim,
          projetos (
            nome,
            empresas (codigo)
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from('alocacoes_blocos')
        .delete()
        .eq('id', blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
      toast.success('Alocação excluída com sucesso');
      setDeleteBlockId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir alocação');
    },
  });

  // Filter collaborators
  const filteredCollaborators = useMemo(() => {
    let result = collaborators;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((c) =>
        c.full_name.toLowerCase().includes(searchLower)
      );
    }

    // If project filter is active, only show collaborators with allocations in that project
    if (projetoFilter) {
      const collabsWithProject = new Set(
        blocks.filter((b) => b.projeto_id === projetoFilter).map((b) => b.colaborador_id)
      );
      result = result.filter((c) => collabsWithProject.has(c.id));
    }

    // If empresa filter is active but no project filter
    if (empresaFilter && !projetoFilter) {
      const projectIdsForEmpresa = new Set(
        projetos.filter((p) => p.empresa_id === empresaFilter).map((p) => p.id)
      );
      const collabsWithEmpresa = new Set(
        blocks.filter((b) => projectIdsForEmpresa.has(b.projeto_id)).map((b) => b.colaborador_id)
      );
      result = result.filter((c) => collabsWithEmpresa.has(c.id));
    }

    return result;
  }, [collaborators, search, projetoFilter, empresaFilter, blocks, projetos]);

  // Navigate period
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (periodType === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else if (periodType === 'fortnight') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 2) : addWeeks(currentDate, 2));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  // Handle create block
  const handleCreateBlock = (colaboradorId: string, date: Date) => {
    setEditingBlock(null);
    setDefaultFormData({
      colaboradorId,
      dataInicio: format(date, 'yyyy-MM-dd'),
      dataFim: format(date, 'yyyy-MM-dd'),
    });
    setIsFormOpen(true);
  };

  // Handle edit block
  const handleEditBlock = (block: Block) => {
    setEditingBlock(block);
    setDefaultFormData({});
    setIsFormOpen(true);
  };

  // Apply default allocations
  const handleApplyDefaults = async () => {
    if (tipo !== 'planejado') {
      toast.error('Aplicar padrões só funciona para alocações planejadas');
      return;
    }

    setIsApplyingDefaults(true);
    const conflicts: string[] = [];
    let created = 0;

    try {
      for (const col of filteredCollaborators) {
        // Find active default for this collaborator
        const activeDefaults = defaultAllocations.filter((d: any) => {
          if (d.colaborador_id !== col.id) return false;
          const defStart = parseISO(d.data_inicio);
          const defEnd = d.data_fim ? parseISO(d.data_fim) : new Date('9999-12-31');
          // Check if default intersects with period
          return defStart <= period.end && defEnd >= period.start;
        });

        if (activeDefaults.length === 0) continue;
        if (activeDefaults.length > 1) {
          conflicts.push(`${col.full_name}: múltiplos padrões ativos`);
          continue;
        }

        const def = activeDefaults[0] as any;

        // Check if there's already a block for this collaborator in the period
        const existingBlock = blocks.find(
          (b) => b.colaborador_id === col.id
        );

        if (existingBlock) {
          conflicts.push(`${col.full_name}: já possui alocação no período`);
          continue;
        }

        // Determine block dates (clamped to period and collaborator employment)
        const defStart = parseISO(def.data_inicio);
        const defEnd = def.data_fim ? parseISO(def.data_fim) : period.end;
        const hireDate = parseISO(col.hire_date);
        const termDate = col.termination_date ? parseISO(col.termination_date) : null;

        let blockStart = defStart < period.start ? period.start : defStart;
        let blockEnd = defEnd > period.end ? period.end : defEnd;

        // Clamp to employment dates
        if (blockStart < hireDate) blockStart = hireDate;
        if (termDate && blockEnd > termDate) blockEnd = termDate;

        if (blockStart > blockEnd) {
          conflicts.push(`${col.full_name}: período inválido`);
          continue;
        }

        // Create block
        const { error } = await supabase.from('alocacoes_blocos').insert({
          colaborador_id: col.id,
          projeto_id: def.projeto_id,
          tipo: 'planejado',
          data_inicio: format(blockStart, 'yyyy-MM-dd'),
          data_fim: format(blockEnd, 'yyyy-MM-dd'),
          observacao: 'Criado automaticamente via padrões',
        });

        if (error) {
          conflicts.push(`${col.full_name}: ${error.message}`);
        } else {
          created++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });

      if (created > 0) {
        toast.success(`${created} alocação(ões) criada(s) com sucesso`);
      }

      if (conflicts.length > 0) {
        toast.warning(`${conflicts.length} conflito(s): ${conflicts.slice(0, 3).join(', ')}${conflicts.length > 3 ? '...' : ''}`);
      }

      if (created === 0 && conflicts.length === 0) {
        toast.info('Nenhum padrão aplicável encontrado para o período');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aplicar padrões');
    } finally {
      setIsApplyingDefaults(false);
    }
  };

  // Auth check
  if (authLoading) {
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Planejamento Gantt</h1>
            <p className="text-muted-foreground">
              Gerencie as alocações de colaboradores por projeto
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleApplyDefaults}
              disabled={isApplyingDefaults || tipo !== 'planejado'}
            >
              {isApplyingDefaults ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Aplicar Padrões
            </Button>
            <Button
              onClick={() => {
                setEditingBlock(null);
                setDefaultFormData({});
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Alocar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Period navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigatePeriod('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[180px] text-center font-medium capitalize">
              {period.label}
            </div>
            <Button variant="outline" size="icon" onClick={() => navigatePeriod('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Period type */}
          <div className="space-y-1">
            <Label className="text-xs">Período</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="fortnight">Quinzena</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as 'planejado' | 'realizado')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Empresa filter */}
          <div className="space-y-1">
            <Label className="text-xs">Empresa</Label>
            <Select
              value={empresaFilter}
              onValueChange={(v) => {
                setEmpresaFilter(v === 'all' ? '' : v);
                setProjetoFilter('');
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Projeto filter */}
          <div className="space-y-1">
            <Label className="text-xs">Projeto</Label>
            <Select
              value={projetoFilter}
              onValueChange={(v) => setProjetoFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {projetos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar Colaborador</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {loadingCollaborators || loadingBlocks ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GanttChart
            collaborators={filteredCollaborators}
            blocks={blocks}
            period={period}
            onEditBlock={handleEditBlock}
            onDeleteBlock={(id) => setDeleteBlockId(id)}
            onCreateBlock={handleCreateBlock}
          />
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBlock ? 'Editar Alocação' : 'Nova Alocação'}
              </DialogTitle>
            </DialogHeader>
            <AlocacaoForm
              alocacaoId={editingBlock?.id}
              colaboradorId={editingBlock?.colaborador_id || defaultFormData.colaboradorId}
              projetoId={editingBlock?.projeto_id}
              tipo={editingBlock?.tipo || tipo}
              dataInicio={editingBlock?.data_inicio || defaultFormData.dataInicio}
              dataFim={editingBlock?.data_fim || defaultFormData.dataFim}
              observacao={editingBlock?.observacao || ''}
              onSuccess={() => {
                setIsFormOpen(false);
                setEditingBlock(null);
                queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingBlock(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteBlockId} onOpenChange={() => setDeleteBlockId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta alocação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteBlockId && deleteMutation.mutate(deleteBlockId)}
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
