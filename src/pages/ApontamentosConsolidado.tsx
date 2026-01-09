import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Clock, AlertCircle, CheckCircle2, XCircle, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { useEffect } from 'react';

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
  const { user, loading, hasRole } = useAuth();
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIntegracao, setFilterIntegracao] = useState<string>('all');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  const [filterProjeto, setFilterProjeto] = useState<string>('all');
  const [filterFuncionario, setFilterFuncionario] = useState<string>('');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');

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

  // Fetch projetos for filter
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

  // Filter data
  const filteredData = useMemo(() => {
    if (!apontamentos) return [];
    
    return apontamentos.filter((a) => {
      // Status filter
      if (filterStatus !== 'all' && a.status_apontamento !== filterStatus) return false;
      
      // Integracao filter
      if (filterIntegracao !== 'all' && a.status_integracao !== filterIntegracao) return false;
      
      // Origem filter
      if (filterOrigem !== 'all' && a.origem !== filterOrigem) return false;
      
      // Projeto filter
      if (filterProjeto !== 'all' && a.projeto_id !== filterProjeto) return false;
      
      // Funcionario filter (search by name or CPF)
      if (filterFuncionario) {
        const search = filterFuncionario.toLowerCase();
        const matchNome = a.nome_funcionario?.toLowerCase().includes(search);
        const matchCpf = a.cpf?.includes(search);
        if (!matchNome && !matchCpf) return false;
      }
      
      // Date range filter
      if (filterDataInicio && a.data_apontamento < filterDataInicio) return false;
      if (filterDataFim && a.data_apontamento > filterDataFim) return false;
      
      return true;
    });
  }, [apontamentos, filterStatus, filterIntegracao, filterOrigem, filterProjeto, filterFuncionario, filterDataInicio, filterDataFim]);

  // Counters - updated to use correct statuses
  const counters = useMemo(() => {
    if (!apontamentos) return { naoLancados: 0, lancados: 0, erros: 0, total: 0 };
    
    // Count from ALL data (not filtered) for overview
    const naoLancados = apontamentos.filter((a) => a.status_apontamento === 'NAO_LANCADO').length;
    const lancados = apontamentos.filter((a) => a.status_integracao === 'OK').length;
    const erros = apontamentos.filter((a) => a.status_integracao === 'ERRO').length;
    
    return {
      naoLancados,
      lancados,
      erros,
      total: apontamentos.length,
    };
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
      a.id,
      a.origem,
      a.cpf,
      a.nome_funcionario || '',
      a.data_apontamento,
      a.horas,
      a.tipo_hora,
      a.projeto_nome || '',
      a.os_numero || '',
      a.status_apontamento,
      a.status_integracao,
      a.motivo_erro || '',
      a.gantt_atualizado ? 'SIM' : 'NAO',
      a.is_pending ? 'SIM' : 'NAO',
      a.observacao || '',
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
    setFilterFuncionario('');
    setFilterDataInicio('');
    setFilterDataFim('');
  };

  const getStatusBadge = (status: ApontamentoStatus) => {
    const variants: Record<ApontamentoStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
      PENDENTE: { variant: 'secondary', label: 'Pendente' },
      LANCADO: { variant: 'default', label: 'Lançado' },
      APROVADO: { variant: 'outline', label: 'Aprovado' },
      REPROVADO: { variant: 'destructive', label: 'Reprovado' },
      NAO_LANCADO: { variant: 'outline', label: 'Não Lançado', className: 'border-yellow-500 text-yellow-600 bg-yellow-50' },
    };
    const { variant, label, className } = variants[status];
    return <Badge variant={variant} className={className}>{label}</Badge>;
  };

  const getIntegracaoBadge = (status: IntegracaoStatus) => {
    if (status === 'OK') {
      return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
    }
    if (status === 'PENDENTE') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
  };

  const getOrigemBadge = (origem: ApontamentoOrigem) => {
    const config: Record<ApontamentoOrigem, { label: string; className: string }> = {
      IMPORTACAO: { label: 'Importação', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      MANUAL: { label: 'Manual', className: 'bg-purple-100 text-purple-700 border-purple-300' },
      SISTEMA: { label: 'Sistema', className: 'bg-gray-100 text-gray-700 border-gray-300' },
    };
    const { label, className } = config[origem];
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

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
            <h1 className="text-2xl font-bold tracking-tight">Apontamentos Consolidado</h1>
            <p className="text-muted-foreground">
              Visualização única: apontamentos reais + pendências do planejamento
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

        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('NAO_LANCADO')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Não Lançados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{counters.naoLancados}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterIntegracao('OK')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lançados (OK)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{counters.lancados}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterIntegracao('ERRO')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Com Erro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{counters.erros}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{counters.total}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
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
                <label className="text-sm font-medium">Status</label>
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
                <label className="text-sm font-medium">Integração</label>
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
                <label className="text-sm font-medium">Origem</label>
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
                <label className="text-sm font-medium">Projeto/OS</label>
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
                <label className="text-sm font-medium">Funcionário (Nome/CPF)</label>
                <Input 
                  placeholder="Buscar..." 
                  value={filterFuncionario}
                  onChange={(e) => setFilterFuncionario(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Início</label>
                <Input 
                  type="date" 
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Fim</label>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 100).map((a) => (
                      <TableRow key={`${a.id}-${a.data_apontamento}-${a.is_pending}`} className={a.is_pending ? 'bg-yellow-50/50' : ''}>
                        <TableCell className="font-medium">
                          {format(new Date(a.data_apontamento), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{a.nome_funcionario || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{a.cpf}</TableCell>
                        <TableCell className="font-mono">{a.os_numero || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{a.projeto_nome || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {a.horas > 0 ? a.horas.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {a.tipo_hora}
                          </Badge>
                        </TableCell>
                        <TableCell>{getOrigemBadge(a.origem)}</TableCell>
                        <TableCell>{getStatusBadge(a.status_apontamento)}</TableCell>
                        <TableCell>{getIntegracaoBadge(a.status_integracao)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-red-600">
                          {a.motivo_erro || '-'}
                        </TableCell>
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
    </Layout>
  );
}
