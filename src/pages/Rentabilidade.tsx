import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { KPICard } from "@/components/rentabilidade/KPICard";
import { VisaoSwitch, VisaoTipo } from "@/components/rentabilidade/VisaoSwitch";
import { RentabilidadeFilters, RentabilidadeFiltersState } from "@/components/rentabilidade/RentabilidadeFilters";
import { MargemIndicator } from "@/components/rentabilidade/MargemBadge";
import { SyncButton } from "@/components/rentabilidade/SyncButton";
import { AgingChart } from "@/components/rentabilidade/AgingChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  PiggyBank,
  BarChart3,
  Eye,
  ChevronUp,
  ChevronDown,
  Link2,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type SortField = 'projeto_nome' | 'receita' | 'custo_direto' | 'custo_mao_obra' | 'resultado' | 'margem';
type SortDirection = 'asc' | 'desc';

export default function Rentabilidade() {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();

  const [visao, setVisao] = useState<VisaoTipo>('competencia');
  const [filters, setFilters] = useState<RentabilidadeFiltersState>({
    periodo: undefined,
    cliente: 'all',
    statusProjeto: 'all',
    statusMargem: 'all',
  });
  const [sortField, setSortField] = useState<SortField>('margem');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch rentabilidade data from view
  const { data: rentabilidadeData, isLoading: loadingRentabilidade } = useQuery({
    queryKey: ['rentabilidade'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_rentabilidade_projeto')
        .select('*');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && hasAnyRole(),
  });

  // Fetch clientes for filter
  const { data: clientes } = useQuery({
    queryKey: ['empresas-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, empresa')
        .eq('status', 'ativo')
        .order('empresa');
      
      if (error) throw error;
      return data?.map(e => ({ id: e.id, nome: e.empresa })) || [];
    },
    enabled: !!user,
  });

  // Fetch total revenue from all AR titles (excluding cancelled)
  const { data: receitaTotal } = useQuery({
    queryKey: ['receita-total-geral'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_contas_receber')
        .select('valor, valor_recebido, status, projeto_id')
        .neq('status', 'CANCELADO');

      if (error) throw error;

      const totais = data?.reduce(
        (acc, t) => ({
          competencia: acc.competencia + Number(t.valor),
          caixa: acc.caixa + Number(t.valor_recebido),
          comProjeto: acc.comProjeto + (t.projeto_id ? Number(t.valor) : 0),
          semProjeto: acc.semProjeto + (t.projeto_id ? 0 : Number(t.valor)),
          count: acc.count + 1,
          comProjetoCount: acc.comProjetoCount + (t.projeto_id ? 1 : 0),
          semProjetoCount: acc.semProjetoCount + (t.projeto_id ? 0 : 1),
        }),
        { competencia: 0, caixa: 0, comProjeto: 0, semProjeto: 0, count: 0, comProjetoCount: 0, semProjetoCount: 0 }
      ) || { competencia: 0, caixa: 0, comProjeto: 0, semProjeto: 0, count: 0, comProjetoCount: 0, semProjetoCount: 0 };

      return totais;
    },
    enabled: !!user && hasAnyRole(),
  });

  // Fetch aging data for charts
  const { data: agingAR } = useQuery({
    queryKey: ['aging-ar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_contas_receber')
        .select('vencimento, valor, valor_recebido, status')
        .in('status', ['ABERTO', 'ATRASADO', 'PARCIAL']);
      
      if (error) throw error;
      return data?.map(d => ({
        vencimento: d.vencimento,
        valor: Number(d.valor) - Number(d.valor_recebido),
      })) || [];
    },
    enabled: !!user,
  });

  const { data: agingAP } = useQuery({
    queryKey: ['aging-ap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_contas_pagar')
        .select('vencimento, valor, valor_pago, status')
        .in('status', ['ABERTO', 'ATRASADO', 'PARCIAL']);
      
      if (error) throw error;
      return data?.map(d => ({
        vencimento: d.vencimento,
        valor: Number(d.valor) - Number(d.valor_pago),
      })) || [];
    },
    enabled: !!user,
  });

  // Fetch last sync
  const { data: lastSync } = useQuery({
    queryKey: ['last-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_sync_log')
        .select('finalizado_em')
        .eq('status', 'SUCESSO')
        .order('finalizado_em', { ascending: false })
        .limit(1)
        .single();
      
      if (error) return null;
      return data?.finalizado_em;
    },
    enabled: !!user,
  });

  // Fetch pending count
  const { data: pendenciasCount } = useQuery({
    queryKey: ['pendencias-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pendencias_financeiras')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ABERTA');
      
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch unmapped Omie codes count
  const { data: codigosNaoMapeadosCount } = useQuery({
    queryKey: ['codigos-nao-mapeados-count'],
    queryFn: async () => {
      // Count distinct omie_projeto_codigo without projeto_id in AR
      const { data: titulosAR } = await supabase
        .from('omie_contas_receber')
        .select('omie_projeto_codigo')
        .not('omie_projeto_codigo', 'is', null)
        .is('projeto_id', null);
      
      // Count distinct omie_projeto_codigo without projeto_id in AP
      const { data: titulosAP } = await supabase
        .from('omie_contas_pagar')
        .select('omie_projeto_codigo')
        .not('omie_projeto_codigo', 'is', null)
        .is('projeto_id', null);
      
      const allCodes = new Set([
        ...(titulosAR?.map(t => t.omie_projeto_codigo) || []),
        ...(titulosAP?.map(t => t.omie_projeto_codigo) || []),
      ]);
      
      return allCodes.size;
    },
    enabled: !!user,
  });

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!rentabilidadeData) return [];

    let filtered = [...rentabilidadeData];

    // Filter by cliente
    if (filters.cliente !== 'all') {
      filtered = filtered.filter(p => p.empresa_id === filters.cliente);
    }

    // Filter by status projeto
    if (filters.statusProjeto !== 'all') {
      filtered = filtered.filter(p => p.status_projeto === filters.statusProjeto);
    }

    // Filter by status margem
    if (filters.statusMargem !== 'all') {
      filtered = filtered.filter(p => p.status_margem === filters.statusMargem);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'projeto_nome':
          aVal = a.projeto_nome || '';
          bVal = b.projeto_nome || '';
          break;
        case 'receita':
          aVal = visao === 'competencia' ? Number(a.receita_competencia) : Number(a.receita_caixa);
          bVal = visao === 'competencia' ? Number(b.receita_competencia) : Number(b.receita_caixa);
          break;
        case 'custo_direto':
          aVal = visao === 'competencia' ? Number(a.custo_direto_competencia) : Number(a.custo_direto_caixa);
          bVal = visao === 'competencia' ? Number(b.custo_direto_competencia) : Number(b.custo_direto_caixa);
          break;
        case 'custo_mao_obra':
          aVal = Number(a.custo_mao_obra);
          bVal = Number(b.custo_mao_obra);
          break;
        case 'resultado':
          aVal = visao === 'competencia' ? Number(a.resultado_competencia) : Number(a.saldo_caixa);
          bVal = visao === 'competencia' ? Number(b.resultado_competencia) : Number(b.saldo_caixa);
          break;
        case 'margem':
          aVal = visao === 'competencia' ? Number(a.margem_competencia_pct) : Number(a.margem_caixa_pct);
          bVal = visao === 'competencia' ? Number(b.margem_competencia_pct) : Number(b.margem_caixa_pct);
          break;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal as string) 
          : (bVal as string).localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });

    return filtered;
  }, [rentabilidadeData, filters, sortField, sortDirection, visao]);

  // Calculate totals
  const totals = useMemo(() => {
    const data = filteredData;
    
    const receita = data.reduce((sum, p) => 
      sum + (visao === 'competencia' ? Number(p.receita_competencia) : Number(p.receita_caixa)), 0);
    const custoDireto = data.reduce((sum, p) => 
      sum + (visao === 'competencia' ? Number(p.custo_direto_competencia) : Number(p.custo_direto_caixa)), 0);
    const custoMO = data.reduce((sum, p) => sum + Number(p.custo_mao_obra), 0);
    const resultado = visao === 'competencia' 
      ? receita - custoDireto - custoMO 
      : receita - custoDireto;
    const margem = receita > 0 ? (resultado / receita) * 100 : 0;
    const aReceber = data.reduce((sum, p) => sum + Number(p.a_receber), 0);
    const aPagar = data.reduce((sum, p) => sum + Number(p.a_pagar), 0);
    const saldoCaixa = data.reduce((sum, p) => sum + Number(p.saldo_caixa), 0);
    const horasTotais = data.reduce((sum, p) => sum + Number(p.horas_totais), 0);

    return {
      receita,
      custoDireto,
      custoMO,
      resultado,
      margem,
      aReceber,
      aPagar,
      saldoCaixa,
      horasTotais,
      projetosCount: data.length,
    };
  }, [filteredData, visao]);

  // Ranking chart data (top 10 by margin)
  const rankingData = useMemo(() => {
    return filteredData
      .filter(p => Number(visao === 'competencia' ? p.receita_competencia : p.receita_caixa) > 0)
      .sort((a, b) => {
        const aVal = visao === 'competencia' ? Number(a.margem_competencia_pct) : Number(a.margem_caixa_pct);
        const bVal = visao === 'competencia' ? Number(b.margem_competencia_pct) : Number(b.margem_caixa_pct);
        return aVal - bVal;
      })
      .slice(0, 10)
      .map(p => ({
        nome: p.projeto_nome?.substring(0, 20) + (p.projeto_nome?.length > 20 ? '...' : ''),
        margem: visao === 'competencia' ? Number(p.margem_competencia_pct) : Number(p.margem_caixa_pct),
        color: Number(p.margem_competencia_pct) >= 20 ? '#22c55e' 
             : Number(p.margem_competencia_pct) >= 10 ? '#eab308'
             : Number(p.margem_competencia_pct) >= 0 ? '#f97316' : '#ef4444',
      }));
  }, [filteredData, visao]);

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

  const handleSyncComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['rentabilidade'] });
    queryClient.invalidateQueries({ queryKey: ['receita-total-geral'] });
    queryClient.invalidateQueries({ queryKey: ['aging-ar'] });
    queryClient.invalidateQueries({ queryKey: ['aging-ap'] });
    queryClient.invalidateQueries({ queryKey: ['last-sync'] });
    queryClient.invalidateQueries({ queryKey: ['pendencias-count'] });
    queryClient.invalidateQueries({ queryKey: ['codigos-nao-mapeados-count'] });
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </Layout>
    );
  }

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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rentabilidade</h1>
            <p className="text-muted-foreground text-sm">
              Visão consolidada do portfólio de projetos
            </p>
          </div>
          <div className="flex items-center gap-3">
            {codigosNaoMapeadosCount && codigosNaoMapeadosCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/rentabilidade/mapeamento')}
                className="border-warning text-warning hover:bg-warning/10"
              >
                <Link2 className="h-4 w-4 mr-2" />
                {codigosNaoMapeadosCount} código(s) não mapeado(s)
              </Button>
            )}
            <VisaoSwitch value={visao} onChange={setVisao} />
            <SyncButton lastSyncAt={lastSync} onSyncComplete={handleSyncComplete} />
          </div>
        </div>

        {/* Filters */}
        <RentabilidadeFilters
          filters={filters}
          onChange={setFilters}
          clientes={clientes || []}
        />

        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            title="Receita Total"
            value={formatCurrency(visao === 'competencia' ? (receitaTotal?.competencia || 0) : (receitaTotal?.caixa || 0))}
            icon={TrendingUp}
            variant={receitaTotal?.semProjetoCount && receitaTotal.semProjetoCount > 0 ? 'warning' : 'success'}
            subtitle={receitaTotal?.semProjetoCount 
              ? `${receitaTotal.semProjetoCount} sem projeto (${formatCurrency(receitaTotal.semProjeto)})` 
              : `${receitaTotal?.count || 0} títulos`}
            tooltip={visao === 'competencia' 
              ? 'Total de todos os títulos emitidos (excl. cancelados)' 
              : 'Total efetivamente recebido (excl. cancelados)'}
            onClick={() => navigate('/rentabilidade/receitas')}
          />
          <KPICard
            title="Receita Projetos"
            value={formatCurrency(totals.receita)}
            icon={Receipt}
            variant="default"
            subtitle={`${totals.projetosCount} projetos`}
            tooltip={visao === 'competencia' 
              ? 'Receita dos projetos vinculados' 
              : 'Recebido dos projetos vinculados'}
          />
          <KPICard
            title="Mão de Obra"
            value={formatCurrency(totals.custoMO)}
            icon={Users}
            badge="Gerencial"
            variant="info"
            subtitle={`${totals.horasTotais.toLocaleString('pt-BR')} horas`}
            tooltip="Custo calculado: horas × custo/hora (não é fluxo de caixa)"
          />
          <KPICard
            title="Resultado"
            value={formatCurrency(totals.resultado)}
            icon={totals.resultado >= 0 ? TrendingUp : TrendingDown}
            variant={totals.resultado >= 0 ? 'success' : 'danger'}
            tooltip={visao === 'competencia' ? 'Receita - Custos Diretos - MO' : 'Recebido - Pago (sem MO)'}
          />
          <KPICard
            title="Margem"
            value={`${totals.margem.toFixed(1)}%`}
            icon={BarChart3}
            variant={totals.margem >= 20 ? 'success' : totals.margem >= 10 ? 'warning' : 'danger'}
            tooltip="Resultado ÷ Receita × 100"
          />
        </div>

        {/* KPI Cards - Row 2 (Caixa) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            title="A Receber"
            value={formatCurrency(totals.aReceber)}
            icon={ArrowUpRight}
            variant="info"
            onClick={() => navigate('/rentabilidade/titulos?tipo=ar&status=aberto')}
          />
          <KPICard
            title="A Pagar"
            value={formatCurrency(totals.aPagar)}
            icon={ArrowDownRight}
            variant="default"
            onClick={() => navigate('/rentabilidade/titulos?tipo=ap&status=aberto')}
          />
          <KPICard
            title="Saldo Caixa"
            value={formatCurrency(totals.saldoCaixa)}
            icon={Wallet}
            variant={totals.saldoCaixa >= 0 ? 'success' : 'danger'}
            badge="Omie"
            tooltip="Recebido - Pago (fluxo de caixa do Omie)"
          />
          <KPICard
            title="Pendências"
            value={pendenciasCount || 0}
            icon={AlertTriangle}
            variant={pendenciasCount && pendenciasCount > 0 ? 'warning' : 'default'}
            onClick={() => navigate('/rentabilidade/pendencias')}
            subtitle={pendenciasCount && pendenciasCount > 0 ? 'Clique para resolver' : 'Nenhuma pendência'}
          />
          <div /> {/* Spacer */}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Ranking Chart */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ranking por Margem</CardTitle>
            </CardHeader>
            <CardContent>
              {rankingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={rankingData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                  >
                    <XAxis type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => `${v}%`} fontSize={11} />
                    <YAxis type="category" dataKey="nome" width={100} fontSize={10} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="margem" radius={[0, 4, 4, 0]}>
                      {rankingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum projeto com receita
                </p>
              )}
            </CardContent>
          </Card>

          {/* Aging A Receber */}
          <AgingChart
            data={agingAR || []}
            title="Aging A Receber"
            tipo="receber"
          />

          {/* Aging A Pagar */}
          <AgingChart
            data={agingAP || []}
            title="Aging A Pagar"
            tipo="pagar"
          />
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Projetos</CardTitle>
              <Badge variant="secondary">{filteredData.length} projetos</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader field="projeto_nome">Projeto</SortHeader>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Omie</TableHead>
                    <SortHeader field="receita">Receita</SortHeader>
                    <SortHeader field="custo_direto">Custos Dir.</SortHeader>
                    <SortHeader field="custo_mao_obra">MO</SortHeader>
                    <SortHeader field="resultado">Resultado</SortHeader>
                    <SortHeader field="margem">Margem</SortHeader>
                    <TableHead>A Receber</TableHead>
                    <TableHead>A Pagar</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRentabilidade ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(11)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Nenhum projeto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((projeto) => {
                      const receita = visao === 'competencia' 
                        ? Number(projeto.receita_competencia) 
                        : Number(projeto.receita_caixa);
                      const custoDireto = visao === 'competencia' 
                        ? Number(projeto.custo_direto_competencia) 
                        : Number(projeto.custo_direto_caixa);
                      const resultado = visao === 'competencia'
                        ? Number(projeto.resultado_competencia)
                        : Number(projeto.saldo_caixa);
                      const margem = visao === 'competencia'
                        ? Number(projeto.margem_competencia_pct)
                        : Number(projeto.margem_caixa_pct);

                      return (
                        <TableRow key={projeto.projeto_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{projeto.projeto_nome}</p>
                              <p className="text-xs text-muted-foreground">OS: {projeto.projeto_os}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{projeto.cliente_nome}</TableCell>
                          <TableCell>
                            {projeto.omie_codigo ? (
                              <Badge variant="outline" className="text-xs">
                                {projeto.omie_codigo}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Não vinculado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(receita)}</TableCell>
                          <TableCell>{formatCurrency(custoDireto)}</TableCell>
                          <TableCell>{formatCurrency(Number(projeto.custo_mao_obra))}</TableCell>
                          <TableCell className={resultado >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {formatCurrency(resultado)}
                          </TableCell>
                          <TableCell>
                            <MargemIndicator valor={margem} />
                          </TableCell>
                          <TableCell>{formatCurrency(Number(projeto.a_receber))}</TableCell>
                          <TableCell>{formatCurrency(Number(projeto.a_pagar))}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/rentabilidade/${projeto.projeto_id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Analisar
                            </Button>
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
