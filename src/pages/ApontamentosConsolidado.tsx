import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Download, FileSpreadsheet, Clock, AlertCircle, CheckCircle2, XCircle, 
  Filter, RefreshCw, AlertTriangle, Edit3, Trash2, Ban, X, CheckSquare, Calendar 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

type ApontamentoOrigem = 'IMPORTACAO' | 'MANUAL' | 'SISTEMA';
type TipoHora = 'NORMAL' | 'H50' | 'H100' | 'NOTURNA';
type ApontamentoStatus = 'PENDENTE' | 'LANCADO' | 'APROVADO' | 'REPROVADO' | 'NAO_LANCADO';
type IntegracaoStatus = 'OK' | 'ERRO' | 'PENDENTE';

interface ApontamentoConsolidado {
  id: string;
  origem: ApontamentoOrigem;
  arquivo_importacao_id: string | null;
  linha_arquivo: number | null;
  data_importacao: string | null;
  projeto_id: string | null;
  projeto_nome: string | null;
  os_numero: string | null;
  tarefa_id: string | null;
  tarefa_nome: string | null;
  funcionario_id: string | null;
  cpf: string;
  nome_funcionario: string | null;
  data_apontamento: string;
  horas: number;
  tipo_hora: TipoHora;
  descricao: string | null;
  observacao: string | null;
  status_apontamento: ApontamentoStatus;
  status_integracao: IntegracaoStatus;
  motivo_erro: string | null;
  gantt_atualizado: boolean;
  data_atualizacao_gantt: string | null;
  created_at: string;
  updated_at: string;
  is_pending: boolean;
}

export default function ApontamentosConsolidado() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading, hasRole } = useAuth();
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIntegracao, setFilterIntegracao] = useState<string>('all');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  const [filterProjeto, setFilterProjeto] = useState<string>('all');
  const [filterEquipe, setFilterEquipe] = useState<string>('all');
  const [filterFuncionario, setFilterFuncionario] = useState<string>('');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modal states
  const [showChangeOSModal, setShowChangeOSModal] = useState(false);
  const [showChangeDateModal, setShowChangeDateModal] = useState(false);
  const [showIgnoreDialog, setShowIgnoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newProjetoId, setNewProjetoId] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const canAccess = hasRole('admin') || hasRole('rh');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch from the consolidated view (includes both real and pending)
  const { data: apontamentos, isLoading, refetch } = useQuery({
    queryKey: ['vw-apontamentos-consolidado'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_apontamentos_consolidado')
        .select('*')
        .order('data_apontamento', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data as ApontamentoConsolidado[];
    },
    enabled: canAccess,
  });

  // Fetch projetos for filter and OS change
  const { data: projetos } = useQuery({
    queryKey: ['projetos-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, os, nome')
        .order('os');
      if (error) throw error;
      return data;
    },
    enabled: canAccess,
  });

  // Fetch collaborators for equipe filter
  const { data: collaborators } = useQuery({
    queryKey: ['collaborators-equipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, cpf, equipe')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: canAccess,
  });

  // Get unique equipes
  const uniqueEquipes = useMemo(() => {
    if (!collaborators) return [];
    return [...new Set(collaborators.map(c => c.equipe).filter(Boolean))].sort() as string[];
  }, [collaborators]);

  // Map CPF to equipe for filtering
  const cpfToEquipe = useMemo(() => {
    if (!collaborators) return new Map<string, string>();
    const map = new Map<string, string>();
    collaborators.forEach(c => {
      if (c.equipe) map.set(c.cpf, c.equipe);
    });
    return map;
  }, [collaborators]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!apontamentos) return [];
    
    return apontamentos.filter((a) => {
      if (filterStatus !== 'all' && a.status_apontamento !== filterStatus) return false;
      if (filterIntegracao !== 'all' && a.status_integracao !== filterIntegracao) return false;
      if (filterOrigem !== 'all' && a.origem !== filterOrigem) return false;
      if (filterProjeto !== 'all' && a.projeto_id !== filterProjeto) return false;
      
      // Filter by equipe using CPF mapping
      if (filterEquipe !== 'all') {
        const apontamentoEquipe = cpfToEquipe.get(a.cpf);
        if (apontamentoEquipe !== filterEquipe) return false;
      }
      
      if (filterFuncionario) {
        const search = filterFuncionario.toLowerCase();
        const matchNome = a.nome_funcionario?.toLowerCase().includes(search);
        const matchCpf = a.cpf?.includes(search);
        if (!matchNome && !matchCpf) return false;
      }
      
      if (filterDataInicio && a.data_apontamento < filterDataInicio) return false;
      if (filterDataFim && a.data_apontamento > filterDataFim) return false;
      
      return true;
    });
  }, [apontamentos, filterStatus, filterIntegracao, filterOrigem, filterProjeto, filterEquipe, filterFuncionario, filterDataInicio, filterDataFim, cpfToEquipe]);

  // Displayed data (limited to 100)
  const displayedData = useMemo(() => filteredData.slice(0, 100), [filteredData]);

  // Handle select all toggle
  useEffect(() => {
    if (selectAll) {
      const allIds = new Set(displayedData.map(a => a.id));
      setSelectedRows(allIds);
    } else if (selectedRows.size === displayedData.length && displayedData.length > 0) {
      // Only clear if we're unchecking "select all" explicitly
      // Don't clear if it was just a mismatch
    }
  }, [selectAll, displayedData]);

  // Update selectAll state when individual selections change
  useEffect(() => {
    if (displayedData.length > 0 && selectedRows.size === displayedData.length) {
      setSelectAll(true);
    } else if (selectedRows.size < displayedData.length) {
      setSelectAll(false);
    }
  }, [selectedRows.size, displayedData.length]);

  // Toggle single row selection
  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(displayedData.map(a => a.id));
      setSelectedRows(allIds);
      setSelectAll(true);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRows(new Set());
    setSelectAll(false);
  };

  // Bulk change OS
  const handleBulkChangeOS = async () => {
    if (!newProjetoId) {
      toast.error('Selecione um projeto');
      return;
    }

    const selectedProject = projetos?.find(p => p.id === newProjetoId);
    if (!selectedProject) return;

    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedRows);
      
      const { error } = await supabase
        .from('apontamentos_consolidado')
        .update({ 
          projeto_id: newProjetoId,
          os_numero: selectedProject.os,
          status_integracao: 'OK',
          status_apontamento: 'LANCADO',
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) throw error;

      toast.success(`${ids.length} apontamentos atualizados com sucesso`);
      setShowChangeOSModal(false);
      setNewProjetoId('');
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['vw-apontamentos-consolidado'] });
      refetch();
    } catch (error: any) {
      toast.error('Erro ao atualizar OS: ' + error.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk change date
  const handleBulkChangeDate = async () => {
    if (!newDate) {
      toast.error('Selecione uma data');
      return;
    }

    const ids = Array.from(selectedRows);
    
    // Filter only non-pending records (real records that can be edited)
    const editableIds = displayedData
      .filter(row => ids.includes(row.id) && !row.is_pending)
      .map(row => row.id);
    
    const pendingCount = ids.length - editableIds.length;
    
    if (editableIds.length === 0) {
      toast.error('Os registros selecionados são do planejamento e não podem ter a data alterada aqui.');
      return;
    }

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('apontamentos_consolidado')
        .update({ 
          data_apontamento: newDate,
          updated_at: new Date().toISOString()
        })
        .in('id', editableIds);

      if (error) throw error;

      let message = `Data de ${editableIds.length} apontamentos alterada para ${format(new Date(newDate), 'dd/MM/yyyy')}`;
      if (pendingCount > 0) {
        message += `. ${pendingCount} registros do planejamento foram ignorados.`;
      }
      toast.success(message);
      setShowChangeDateModal(false);
      setNewDate('');
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['vw-apontamentos-consolidado'] });
      refetch();
    } catch (error: any) {
      toast.error('Erro ao alterar data: ' + error.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk ignore
  const handleBulkIgnore = async () => {
    const ids = Array.from(selectedRows);
    
    // Filter only non-pending records
    const editableIds = displayedData
      .filter(row => ids.includes(row.id) && !row.is_pending)
      .map(row => row.id);
    
    const pendingCount = ids.length - editableIds.length;
    
    if (editableIds.length === 0) {
      toast.error('Os registros selecionados são do planejamento e não podem ser ignorados aqui.');
      return;
    }

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('apontamentos_consolidado')
        .update({ 
          status_apontamento: 'REPROVADO',
          observacao: 'Ignorado pelo usuário em ' + format(new Date(), 'dd/MM/yyyy HH:mm'),
          updated_at: new Date().toISOString()
        })
        .in('id', editableIds);

      if (error) throw error;

      let message = `${editableIds.length} apontamentos ignorados`;
      if (pendingCount > 0) {
        message += `. ${pendingCount} registros do planejamento foram pulados.`;
      }
      toast.success(message);
      setShowIgnoreDialog(false);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['vw-apontamentos-consolidado'] });
      refetch();
    } catch (error: any) {
      toast.error('Erro ao ignorar: ' + error.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk delete - handles both real records and pending (planned) records
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRows);
    const selectedRecords = displayedData.filter(row => ids.includes(row.id));
    
    // Separate by source table
    const apontamentosIds = selectedRecords
      .filter(row => !row.is_pending)
      .map(row => row.id);
    
    const alocacoesIds = selectedRecords
      .filter(row => row.is_pending)
      .map(row => row.id);

    if (apontamentosIds.length === 0 && alocacoesIds.length === 0) {
      toast.error('Nenhum registro selecionado para excluir.');
      setShowDeleteDialog(false);
      return;
    }

    setBulkActionLoading(true);
    try {
      let deletedApontamentos = 0;
      let deletedAlocacoes = 0;
      
      // Delete real apontamentos from apontamentos_consolidado
      if (apontamentosIds.length > 0) {
        const { error } = await supabase
          .from('apontamentos_consolidado')
          .delete()
          .in('id', apontamentosIds);
        if (error) throw error;
        deletedApontamentos = apontamentosIds.length;
      }
      
      // Delete pending allocations from alocacoes_blocos
      if (alocacoesIds.length > 0) {
        const { error } = await supabase
          .from('alocacoes_blocos')
          .delete()
          .in('id', alocacoesIds);
        if (error) throw error;
        deletedAlocacoes = alocacoesIds.length;
      }

      const totalDeleted = deletedApontamentos + deletedAlocacoes;
      let message = `${totalDeleted} registro(s) excluído(s)`;
      if (deletedApontamentos > 0 && deletedAlocacoes > 0) {
        message = `${deletedApontamentos} apontamento(s) e ${deletedAlocacoes} alocação(ões) excluído(s)`;
      }
      toast.success(message);
      setShowDeleteDialog(false);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['vw-apontamentos-consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
      refetch();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Counters
  const counters = useMemo(() => {
    if (!apontamentos) return { naoLancados: 0, lancados: 0, erros: 0, total: 0 };
    
    const naoLancados = apontamentos.filter((a) => a.status_apontamento === 'NAO_LANCADO').length;
    const lancados = apontamentos.filter((a) => a.status_integracao === 'OK').length;
    const erros = apontamentos.filter((a) => a.status_integracao === 'ERRO').length;
    
    return { naoLancados, lancados, erros, total: apontamentos.length };
  }, [apontamentos]);

  // Export to XLSX
  const handleExportXLSX = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    
    const exportData = filteredData.map((a) => ({
      'ID': a.id,
      'Origem': a.origem,
      'CPF': a.cpf,
      'Funcionário': a.nome_funcionario,
      'Data Apontamento': a.data_apontamento,
      'Horas': a.horas,
      'Tipo Hora': a.tipo_hora,
      'Projeto': a.projeto_nome,
      'OS': a.os_numero,
      'Status': a.status_apontamento,
      'Integração': a.status_integracao,
      'Erro': a.motivo_erro || '',
      'Gantt Atualizado': a.gantt_atualizado ? 'SIM' : 'NAO',
      'Pendente': a.is_pending ? 'SIM' : 'NAO',
      'Observação': a.observacao || '',
      'Data Importação': a.data_importacao ? format(new Date(a.data_importacao), 'dd/MM/yyyy HH:mm') : '',
      'Criado em': format(new Date(a.created_at), 'dd/MM/yyyy HH:mm'),
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Apontamentos');
    XLSX.writeFile(wb, `apontamentos_consolidado_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('Exportação realizada com sucesso');
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    
    const headers = ['ID', 'Origem', 'CPF', 'Funcionário', 'Data Apontamento', 'Horas', 'Tipo Hora', 'Projeto', 'OS', 'Status', 'Integração', 'Erro', 'Gantt Atualizado', 'Pendente', 'Observação'];
    const rows = filteredData.map((a) => [
      a.id, a.origem, a.cpf, a.nome_funcionario || '', a.data_apontamento, a.horas, a.tipo_hora,
      a.projeto_nome || '', a.os_numero || '', a.status_apontamento, a.status_integracao,
      a.motivo_erro || '', a.gantt_atualizado ? 'SIM' : 'NAO', a.is_pending ? 'SIM' : 'NAO', a.observacao || '',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apontamentos_consolidado_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Exportação realizada com sucesso');
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterIntegracao('all');
    setFilterOrigem('all');
    setFilterProjeto('all');
    setFilterEquipe('all');
    setFilterFuncionario('');
    setFilterDataInicio('');
    setFilterDataFim('');
  };

  const getStatusBadge = (status: ApontamentoStatus) => {
    const variants: Record<ApontamentoStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'pending'; label: string }> = {
      PENDENTE: { variant: 'pending', label: 'Pendente' },
      LANCADO: { variant: 'success', label: 'Lançado' },
      APROVADO: { variant: 'success', label: 'Aprovado' },
      REPROVADO: { variant: 'destructive', label: 'Reprovado' },
      NAO_LANCADO: { variant: 'warning', label: 'Não Lançado' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getIntegracaoBadge = (status: IntegracaoStatus) => {
    if (status === 'OK') {
      return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
    }
    if (status === 'PENDENTE') {
      return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
    return <Badge variant="error"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
  };

  const getOrigemBadge = (origem: ApontamentoOrigem, isPending: boolean) => {
    if (isPending) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Planejado
        </Badge>
      );
    }
    const config: Record<ApontamentoOrigem, { label: string; variant: 'info' | 'secondary' | 'outline' }> = {
      IMPORTACAO: { label: 'Importação', variant: 'info' },
      MANUAL: { label: 'Manual', variant: 'secondary' },
      SISTEMA: { label: 'Sistema', variant: 'outline' },
    };
    const { label, variant } = config[origem];
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Calculate counts for action bar
  const selectionInfo = useMemo(() => {
    const ids = Array.from(selectedRows);
    const selected = displayedData.filter(row => ids.includes(row.id));
    const editableCount = selected.filter(row => !row.is_pending).length;
    const pendingCount = selected.filter(row => row.is_pending).length;
    return { editableCount, pendingCount, total: selected.length };
  }, [selectedRows, displayedData]);

  if (loading || !canAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            {loading ? 'Carregando...' : 'Acesso negado'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apontamentos</h1>
            <p className="text-muted-foreground text-sm">
              Visualização consolidada: apontamentos reais + pendências do planejamento
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportXLSX}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Floating Action Bar */}
        {selectedRows.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <Card className="shadow-xl border-primary/20 bg-card/95 backdrop-blur-sm">
              <CardContent className="py-3 px-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedRows.size} selecionados</span>
                  {selectionInfo.pendingCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({selectionInfo.editableCount} editáveis, {selectionInfo.pendingCount} planejados)
                    </span>
                  )}
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowChangeOSModal(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Alterar OS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowChangeDateModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Alterar Data
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowIgnoreDialog(true)}
                    disabled={selectionInfo.editableCount === 0}
                    title={selectionInfo.editableCount === 0 ? 'Apenas registros do planejamento selecionados' : ''}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Ignorar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={selectionInfo.total === 0}
                    title={selectionInfo.total === 0 ? 'Nenhum registro selecionado' : ''}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors" 
            onClick={() => setFilterStatus('NAO_LANCADO')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Não Lançados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-3xl font-bold">{counters.naoLancados}</span>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors" 
            onClick={() => setFilterIntegracao('OK')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Lançados (OK)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-3xl font-bold">{counters.lancados}</span>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors" 
            onClick={() => setFilterIntegracao('ERRO')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Com Erro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-3xl font-bold">{counters.erros}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-3xl font-bold">{counters.total}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="NAO_LANCADO">Não Lançado</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="LANCADO">Lançado</SelectItem>
                    <SelectItem value="APROVADO">Aprovado</SelectItem>
                    <SelectItem value="REPROVADO">Reprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Integração</label>
                <Select value={filterIntegracao} onValueChange={setFilterIntegracao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="ERRO">Erro</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Origem</label>
                <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="IMPORTACAO">Importação</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="SISTEMA">Sistema (Pendências)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Projeto/OS</label>
                <Select value={filterProjeto} onValueChange={setFilterProjeto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {projetos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.os} - {p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Equipe</label>
                <Select value={filterEquipe} onValueChange={setFilterEquipe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueEquipes.map((equipe) => (
                      <SelectItem key={equipe} value={equipe}>{equipe}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Funcionário</label>
                <Input 
                  placeholder="Nome ou CPF..." 
                  value={filterFuncionario}
                  onChange={(e) => setFilterFuncionario(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Início</label>
                <Input 
                  type="date" 
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Fim</label>
                <Input 
                  type="date" 
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum apontamento encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Integração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedData.map((a) => (
                      <TableRow 
                        key={`${a.id}-${a.data_apontamento}-${a.is_pending}`} 
                        className={`
                          ${a.is_pending ? 'bg-amber-500/5' : ''}
                          ${selectedRows.has(a.id) ? 'bg-primary/5 border-primary/20' : ''}
                        `}
                        data-state={selectedRows.has(a.id) ? 'selected' : undefined}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedRows.has(a.id)}
                            onCheckedChange={() => toggleRowSelection(a.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(new Date(a.data_apontamento), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{a.nome_funcionario || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{a.cpf}</TableCell>
                        <TableCell className="font-mono">{a.os_numero || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{a.projeto_nome || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="text-right font-mono">
                          {a.horas > 0 ? a.horas.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {a.tipo_hora}
                          </Badge>
                        </TableCell>
                        <TableCell>{getOrigemBadge(a.origem, a.is_pending)}</TableCell>
                        <TableCell>{getStatusBadge(a.status_apontamento)}</TableCell>
                        <TableCell>{getIntegracaoBadge(a.status_integracao)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredData.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    Mostrando 100 de {filteredData.length} registros. Use os filtros para refinar a busca.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change OS Modal */}
      <Dialog open={showChangeOSModal} onOpenChange={setShowChangeOSModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar OS</DialogTitle>
            <DialogDescription>
              Selecione o projeto/OS para atribuir aos {selectedRows.size} apontamentos selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Projeto/OS</label>
              <Select value={newProjetoId} onValueChange={setNewProjetoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto..." />
                </SelectTrigger>
                <SelectContent>
                  {projetos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.os} - {p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeOSModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkChangeOS} disabled={bulkActionLoading || !newProjetoId}>
              {bulkActionLoading ? 'Atualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Date Modal */}
      <Dialog open={showChangeDateModal} onOpenChange={setShowChangeDateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Data</DialogTitle>
            <DialogDescription>
              Selecione a nova data para os {selectionInfo.editableCount} apontamentos editáveis.
              {selectionInfo.pendingCount > 0 && (
                <span className="block mt-1 text-amber-500">
                  {selectionInfo.pendingCount} registros do planejamento serão ignorados.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Data</label>
              <Input 
                type="date" 
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            {/* Preview dos registros selecionados */}
            <div className="max-h-40 overflow-auto border rounded-lg p-2 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">
                Registros que serão alterados:
              </p>
              {Array.from(selectedRows).slice(0, 5).map(id => {
                const apt = displayedData.find(a => a.id === id);
                if (!apt || apt.is_pending) return null;
                return (
                  <div key={id} className="text-xs py-1 border-b border-border/50 last:border-0">
                    {apt.nome_funcionario || apt.cpf} - {format(new Date(apt.data_apontamento), 'dd/MM/yyyy')}
                  </div>
                );
              })}
              {selectionInfo.editableCount > 5 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ... e mais {selectionInfo.editableCount - 5} registros
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeDateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkChangeDate} 
              disabled={bulkActionLoading || !newDate || selectionInfo.editableCount === 0}
            >
              {bulkActionLoading ? 'Atualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Confirmation Dialog */}
      <AlertDialog open={showIgnoreDialog} onOpenChange={setShowIgnoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorar apontamentos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá marcar {selectedRows.size} apontamentos como "Reprovado". 
              Eles não serão considerados nos cálculos de custo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkIgnore} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Ignorando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir apontamentos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir permanentemente {selectedRows.size} apontamentos. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              disabled={bulkActionLoading}
              className="bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25"
            >
              {bulkActionLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}