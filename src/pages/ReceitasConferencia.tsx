import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, FileSpreadsheet, ChevronUp, ChevronDown, Link2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortField = 'cliente' | 'numero_documento' | 'data_emissao' | 'vencimento' | 'valor' | 'status';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<string, string> = {
  PAGO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ABERTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ATRASADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CANCELADO: 'bg-muted text-muted-foreground',
};

export default function ReceitasConferencia() {
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('ativo');
  const [projetoFilter, setProjetoFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('vencimento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch all AR titles (excluding cancelled for main view)
  const { data: titulos, isLoading } = useQuery({
    queryKey: ['receitas-conferencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_contas_receber')
        .select(`
          id,
          cliente,
          cliente_cnpj,
          numero_documento,
          parcela,
          descricao,
          data_emissao,
          vencimento,
          valor,
          valor_recebido,
          status,
          projeto_id,
          omie_projeto_codigo
        `)
        .order('data_emissao', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && hasAnyRole(),
  });

  // Fetch projetos to map IDs to names
  const { data: projetos } = useQuery({
    queryKey: ['projetos-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Create a map for quick lookup
  const projetosMap = useMemo(() => {
    const map = new Map<string, { nome: string; os: string }>();
    projetos?.forEach(p => map.set(p.id, { nome: p.nome, os: p.os }));
    return map;
  }, [projetos]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!titulos) return [];

    let filtered = [...titulos];

    // Filter by status
    if (statusFilter === 'ativo') {
      filtered = filtered.filter(t => t.status !== 'CANCELADO');
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Filter by projeto linkage
    if (projetoFilter === 'com') {
      filtered = filtered.filter(t => t.projeto_id !== null);
    } else if (projetoFilter === 'sem') {
      filtered = filtered.filter(t => t.projeto_id === null);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number | Date = '';
      let bVal: string | number | Date = '';

      switch (sortField) {
        case 'cliente':
          aVal = a.cliente || '';
          bVal = b.cliente || '';
          break;
        case 'numero_documento':
          aVal = a.numero_documento || '';
          bVal = b.numero_documento || '';
          break;
        case 'data_emissao':
          aVal = a.data_emissao ? new Date(a.data_emissao) : new Date(0);
          bVal = b.data_emissao ? new Date(b.data_emissao) : new Date(0);
          break;
        case 'vencimento':
          aVal = a.vencimento ? new Date(a.vencimento) : new Date(0);
          bVal = b.vencimento ? new Date(b.vencimento) : new Date(0);
          break;
        case 'valor':
          aVal = Number(a.valor);
          bVal = Number(b.valor);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc' 
          ? aVal.getTime() - bVal.getTime() 
          : bVal.getTime() - aVal.getTime();
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return filtered;
  }, [titulos, statusFilter, projetoFilter, sortField, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!titulos) return { emitido: 0, recebido: 0, aReceber: 0, cancelado: 0, count: 0 };

    const ativos = titulos.filter(t => t.status !== 'CANCELADO');
    const cancelados = titulos.filter(t => t.status === 'CANCELADO');

    return {
      emitido: ativos.reduce((sum, t) => sum + Number(t.valor), 0),
      recebido: ativos.reduce((sum, t) => sum + Number(t.valor_recebido), 0),
      aReceber: ativos.reduce((sum, t) => sum + (Number(t.valor) - Number(t.valor_recebido)), 0),
      cancelado: cancelados.reduce((sum, t) => sum + Number(t.valor), 0),
      count: ativos.length,
      comProjeto: ativos.filter(t => t.projeto_id !== null).length,
      semProjeto: ativos.filter(t => t.projeto_id === null).length,
    };
  }, [titulos]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  const exportToCSV = () => {
    if (!filteredData.length) return;

    const headers = ['Cliente', 'CNPJ', 'Nº Documento', 'Parcela', 'Descrição', 'Emissão', 'Vencimento', 'Valor', 'Recebido', 'Status', 'Projeto'];
    const rows = filteredData.map(t => [
      t.cliente || '',
      t.cliente_cnpj || '',
      t.numero_documento || '',
      t.parcela || '',
      t.descricao || '',
      t.data_emissao ? format(new Date(t.data_emissao), 'dd/MM/yyyy') : '',
      t.vencimento ? format(new Date(t.vencimento), 'dd/MM/yyyy') : '',
      Number(t.valor).toFixed(2).replace('.', ','),
      Number(t.valor_recebido).toFixed(2).replace('.', ','),
      t.status,
      t.projeto_id ? projetosMap.get(t.projeto_id)?.os || t.projeto_id : '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receitas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasAnyRole()) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Acesso não autorizado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rentabilidade')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Conferência de Receitas</h1>
              <p className="text-muted-foreground text-sm">
                Todos os títulos a receber do Omie
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={exportToCSV} disabled={!filteredData.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Emitido</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.emitido)}</p>
              <p className="text-xs text-muted-foreground">{totals.count} títulos ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Recebido</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totals.recebido)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">A Receber</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.aReceber)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Cancelado</p>
              <p className="text-xl font-bold text-muted-foreground line-through">{formatCurrency(totals.cancelado)}</p>
              <p className="text-xs text-muted-foreground">Não incluso nos totais</p>
            </CardContent>
          </Card>
          <Card className={totals.semProjeto > 0 ? 'border-warning' : ''}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Vínculos</p>
              <p className="text-sm">
                <span className="font-medium text-green-600">{totals.comProjeto}</span> com projeto
              </p>
              <p className="text-sm">
                <span className={`font-medium ${totals.semProjeto > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                  {totals.semProjeto}
                </span> sem projeto
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos (sem cancelados)</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="ABERTO">Aberto</SelectItem>
              <SelectItem value="ATRASADO">Atrasado</SelectItem>
              <SelectItem value="PARCIAL">Parcial</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projetoFilter} onValueChange={setProjetoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Vínculo com projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="com">Com Projeto</SelectItem>
              <SelectItem value="sem">Sem Projeto</SelectItem>
            </SelectContent>
          </Select>

          {projetoFilter === 'sem' && totals.semProjeto > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rentabilidade/mapeamento')}
              className="border-warning text-warning hover:bg-warning/10"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Mapear projetos
            </Button>
          )}

          <div className="ml-auto">
            <Badge variant="secondary">{filteredData.length} registros</Badge>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader field="cliente">Cliente</SortHeader>
                    <SortHeader field="numero_documento">Nº Doc</SortHeader>
                    <SortHeader field="data_emissao">Emissão</SortHeader>
                    <SortHeader field="vencimento">Vencimento</SortHeader>
                    <SortHeader field="valor">Valor</SortHeader>
                    <TableHead>Recebido</TableHead>
                    <SortHeader field="status">Status</SortHeader>
                    <TableHead>Projeto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum título encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((titulo) => {
                      const projeto = titulo.projeto_id ? projetosMap.get(titulo.projeto_id) : null;

                      return (
                        <TableRow key={titulo.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{titulo.cliente}</p>
                              {titulo.cliente_cnpj && (
                                <p className="text-xs text-muted-foreground">{titulo.cliente_cnpj}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono text-sm">{titulo.numero_documento}</p>
                              {titulo.parcela && (
                                <p className="text-xs text-muted-foreground">Parc: {titulo.parcela}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {titulo.data_emissao 
                              ? format(new Date(titulo.data_emissao), 'dd/MM/yy', { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {titulo.vencimento 
                              ? format(new Date(titulo.vencimento), 'dd/MM/yy', { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(titulo.valor))}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(Number(titulo.valor_recebido))}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusColors[titulo.status] || ''}>
                              {titulo.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {projeto ? (
                              <div>
                                <p className="text-sm font-medium truncate max-w-[150px]">{projeto.nome}</p>
                                <p className="text-xs text-muted-foreground">OS: {projeto.os}</p>
                              </div>
                            ) : titulo.omie_projeto_codigo ? (
                              <Badge variant="outline" className="text-warning border-warning">
                                Cód: {titulo.omie_projeto_codigo}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
