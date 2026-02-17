import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { KPICard } from "@/components/rentabilidade/KPICard";
import { VisaoSwitch, VisaoTipo } from "@/components/rentabilidade/VisaoSwitch";
import { MargemIndicator } from "@/components/rentabilidade/MargemBadge";
import { TitulosTable } from "@/components/rentabilidade/TitulosTable";
import { MaoObraTable } from "@/components/rentabilidade/MaoObraTable";
import { PendenciasTable } from "@/components/rentabilidade/PendenciasTable";
import { CustosMensaisChart } from "@/components/rentabilidade/CustosMensaisChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  BarChart3,
  FileText,
  AlertTriangle,
  Clock,
  Building2,
  Timer,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export default function RentabilidadeProjeto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, hasAnyRole } = useAuth();
  const [visao, setVisao] = useState<VisaoTipo>('competencia');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch project data from view
  const { data: projeto, isLoading: loadingProjeto } = useQuery({
    queryKey: ['rentabilidade-projeto', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_rentabilidade_projeto')
        .select('*')
        .eq('projeto_id', id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id && hasAnyRole(),
  });

  // Fetch AR titles
  const { data: titulosAR } = useQuery({
    queryKey: ['titulos-ar', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_contas_receber')
        .select('*')
        .eq('projeto_id', id)
        .order('vencimento', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!id,
  });

  // Fetch AP titles
  const { data: titulosAP } = useQuery({
    queryKey: ['titulos-ap', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omie_contas_pagar')
        .select('*')
        .eq('projeto_id', id)
        .order('vencimento', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!id,
  });

  // Fetch labor costs
  const { data: custosMO } = useQuery({
    queryKey: ['custos-mo', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custo_projeto_dia')
        .select(`
          colaborador_id,
          horas_normais,
          horas_50,
          horas_100,
          horas_noturnas,
          custo_hora,
          custo_total,
          data
        `)
        .eq('projeto_id', id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!id,
  });

  // Fetch collaborators for names
  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-nomes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, position');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch pendencias
  const { data: pendencias } = useQuery({
    queryKey: ['pendencias-projeto', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pendencias_financeiras')
        .select('*')
        .eq('projeto_id', id)
        .eq('status', 'ABERTA');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!id,
  });

  // Aggregate labor by collaborator
  const maoObraAgregada = useMemo(() => {
    if (!custosMO || !colaboradores) return [];
    
    const byColaborador: Record<string, {
      colaborador_id: string;
      nome: string;
      cargo: string;
      horas: number;
      custo_hora_medio: number;
      custo_total: number;
      registros: number;
    }> = {};

    custosMO.forEach(c => {
      const colabId = c.colaborador_id;
      const colab = colaboradores.find(col => col.id === colabId);
      
      if (!byColaborador[colabId]) {
        byColaborador[colabId] = {
          colaborador_id: colabId,
          nome: colab?.full_name || 'Desconhecido',
          cargo: colab?.position || '-',
          horas: 0,
          custo_hora_medio: 0,
          custo_total: 0,
          registros: 0,
        };
      }

      const horas = Number(c.horas_normais) + Number(c.horas_50) + Number(c.horas_100) + Number(c.horas_noturnas);
      byColaborador[colabId].horas += horas;
      byColaborador[colabId].custo_total += Number(c.custo_total) || 0;
      byColaborador[colabId].custo_hora_medio += Number(c.custo_hora) || 0;
      byColaborador[colabId].registros += 1;
    });

    return Object.values(byColaborador).map(c => ({
      ...c,
      custo_hora_medio: c.registros > 0 ? c.custo_hora_medio / c.registros : 0,
    })).sort((a, b) => b.custo_total - a.custo_total);
  }, [custosMO, colaboradores]);

  // Monthly data for chart
  const dadosMensais = useMemo(() => {
    if (!titulosAR && !titulosAP && !custosMO) return [];

    const byMonth: Record<string, { mes: string; receita: number; custo_direto: number; custo_mo: number }> = {};

    // AR titles
    titulosAR?.forEach(t => {
      const mes = t.data_emissao?.substring(0, 7); // YYYY-MM
      if (!mes) return;
      if (!byMonth[mes]) byMonth[mes] = { mes, receita: 0, custo_direto: 0, custo_mo: 0 };
      byMonth[mes].receita += Number(t.valor) || 0;
    });

    // AP titles
    titulosAP?.forEach(t => {
      const mes = t.data_emissao?.substring(0, 7);
      if (!mes) return;
      if (!byMonth[mes]) byMonth[mes] = { mes, receita: 0, custo_direto: 0, custo_mo: 0 };
      byMonth[mes].custo_direto += Number(t.valor) || 0;
    });

    // Labor costs
    custosMO?.forEach(c => {
      const mes = c.data?.substring(0, 7);
      if (!mes) return;
      if (!byMonth[mes]) byMonth[mes] = { mes, receita: 0, custo_direto: 0, custo_mo: 0 };
      byMonth[mes].custo_mo += Number(c.custo_total) || 0;
    });

    return Object.values(byMonth)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12); // Last 12 months
  }, [titulosAR, titulosAP, custosMO]);

  if (authLoading || loadingProjeto) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
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

  if (!projeto) {
    return (
      <Layout>
        <div className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">Projeto não encontrado.</p>
          <Button variant="outline" onClick={() => navigate('/rentabilidade')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  const receita = visao === 'competencia' ? Number(projeto.receita_competencia) : Number(projeto.receita_caixa);
  const custoDireto = visao === 'competencia' ? Number(projeto.custo_direto_competencia) : Number(projeto.custo_direto_caixa);
  const custoMO = Number(projeto.custo_mao_obra);
  const resultado = visao === 'competencia' ? Number(projeto.resultado_competencia) : Number(projeto.saldo_caixa);
  const margem = visao === 'competencia' ? Number(projeto.margem_competencia_pct) : Number(projeto.margem_caixa_pct);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rentabilidade')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{projeto.projeto_nome}</h1>
                <MargemIndicator valor={margem} />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {projeto.cliente_nome || 'Cliente não informado'}
                </span>
                <span>•</span>
                <span>OS: {projeto.projeto_os}</span>
                {projeto.omie_codigo && (
                  <>
                    <span>•</span>
                    <span>Omie: {projeto.omie_codigo}</span>
                  </>
                )}
                {projeto.status_projeto && (
                  <>
                    <span>•</span>
                    <Badge variant={projeto.status_projeto === 'ATIVO' ? 'default' : 'secondary'}>
                      {projeto.status_projeto}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <VisaoSwitch value={visao} onChange={setVisao} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Receita"
            value={formatCurrency(receita)}
            icon={TrendingUp}
            variant="success"
            tooltip={visao === 'competencia' ? 'Total de títulos emitidos' : 'Total efetivamente recebido'}
          />
          <KPICard
            title="Custos Diretos"
            value={formatCurrency(custoDireto)}
            icon={Receipt}
            variant="default"
            tooltip={visao === 'competencia' ? 'Total de títulos a pagar' : 'Total efetivamente pago'}
          />
          <KPICard
            title="Mão de Obra"
            value={formatCurrency(custoMO)}
            icon={Users}
            variant="info"
            badge="Gerencial"
            subtitle={`${Number(projeto.horas_totais).toLocaleString('pt-BR')} horas`}
          />
          <KPICard
            title="Resultado"
            value={formatCurrency(resultado)}
            icon={resultado >= 0 ? TrendingUp : TrendingDown}
            variant={resultado >= 0 ? 'success' : 'danger'}
          />
        </div>

        {/* Hours KPIs - only show if horas_previstas is set */}
        {projeto.horas_previstas && Number(projeto.horas_previstas) > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Horas Previstas"
              value={`${Number(projeto.horas_previstas).toLocaleString('pt-BR')}h`}
              icon={Timer}
              variant="default"
              tooltip="Total de horas planejadas para o projeto"
            />
            <KPICard
              title="Horas Realizadas"
              value={`${Number(projeto.horas_totais).toLocaleString('pt-BR')}h`}
              icon={Clock}
              variant="info"
              tooltip="Total de horas apontadas até o momento"
            />
            <KPICard
              title="Desvio"
              value={projeto.desvio_horas_pct !== null 
                ? `${Number(projeto.desvio_horas_pct) > 0 ? '+' : ''}${Number(projeto.desvio_horas_pct).toFixed(1)}%`
                : '-'}
              icon={Number(projeto.desvio_horas_pct || 0) > 0 ? TrendingUp : TrendingDown}
              variant={
                Number(projeto.desvio_horas_pct || 0) <= 0 ? 'success' :
                Number(projeto.desvio_horas_pct || 0) <= 20 ? 'warning' :
                'danger'
              }
              tooltip={`${Number(projeto.desvio_horas || 0) > 0 ? '+' : ''}${Number(projeto.desvio_horas || 0).toLocaleString('pt-BR')}h`}
            />
          </div>
        )}

        {/* Contract info */}
        {projeto.valor_contrato && Number(projeto.valor_contrato) > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Valor Contrato:</span>{" "}
                  <span className="font-medium">{formatCurrency(Number(projeto.valor_contrato))}</span>
                </div>
                {projeto.tem_aditivos && (
                  <div>
                    <span className="text-muted-foreground">Aditivos Previstos:</span>{" "}
                    <span className="font-medium">{formatCurrency(Number(projeto.valor_aditivos_previsto))}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  <span className="font-medium">{projeto.tipo_contrato || 'Não definido'}</span>
                </div>
                {projeto.data_inicio_real && (
                  <div>
                    <span className="text-muted-foreground">Início:</span>{" "}
                    <span className="font-medium">
                      {new Date(projeto.data_inicio_real).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {projeto.data_fim_planejada && (
                  <div>
                    <span className="text-muted-foreground">Previsão Término:</span>{" "}
                    <span className="font-medium">
                      {new Date(projeto.data_fim_planejada).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList>
            <TabsTrigger value="resumo" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Financeiro
              {(titulosAR?.length || 0) + (titulosAP?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {(titulosAR?.length || 0) + (titulosAP?.length || 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mao-obra" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Mão de Obra
              {maoObraAgregada.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {maoObraAgregada.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pendencias" className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Pendências
              {pendencias && pendencias.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {pendencias.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <CustosMensaisChart data={dadosMensais} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Custo Médio/Hora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(Number(projeto.custo_medio_hora))}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Receita/Hora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(Number(projeto.receita_por_hora))}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Margem por Hora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(Number(projeto.receita_por_hora) - Number(projeto.custo_medio_hora))}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financeiro">
            <TitulosTable 
              titulosAR={titulosAR || []} 
              titulosAP={titulosAP || []} 
            />
          </TabsContent>

          <TabsContent value="mao-obra" className="space-y-4">
            {/* Hours Progress Bar */}
            {projeto.horas_previstas && Number(projeto.horas_previstas) > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Consumo de Horas</span>
                    <span className={cn(
                      "font-medium",
                      Number(projeto.horas_totais) > Number(projeto.horas_previstas) ? 'text-destructive' :
                      Number(projeto.horas_totais) > Number(projeto.horas_previstas) * 0.8 ? 'text-amber-500' :
                      'text-emerald-500'
                    )}>
                      {Number(projeto.horas_totais).toLocaleString('pt-BR')}h / {Number(projeto.horas_previstas).toLocaleString('pt-BR')}h previstas
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, (Number(projeto.horas_totais) / Number(projeto.horas_previstas)) * 100)} 
                    className={cn(
                      "h-3",
                      Number(projeto.horas_totais) > Number(projeto.horas_previstas) && "[&>div]:bg-destructive",
                      Number(projeto.horas_totais) > Number(projeto.horas_previstas) * 0.8 && 
                      Number(projeto.horas_totais) <= Number(projeto.horas_previstas) && "[&>div]:bg-amber-500"
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((Number(projeto.horas_totais) / Number(projeto.horas_previstas)) * 100)}% do total previsto
                  </p>
                </CardContent>
              </Card>
            )}
            <MaoObraTable data={maoObraAgregada} />
          </TabsContent>

          <TabsContent value="pendencias">
            <PendenciasTable data={pendencias || []} projetoId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
