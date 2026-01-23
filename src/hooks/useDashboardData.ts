import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

export type Periodo = 'semana' | 'mes' | 'trimestre';

interface Alerta {
  tipo: 'prazo_critico' | 'margem_negativa' | 'apontamentos_pendentes' | 'titulos_vencidos' | 'sem_custo' | 'pendente_aprovacao' | 'estouro_horas';
  quantidade: number;
  prioridade: 'vermelho' | 'amarelo';
  label: string;
  link: string;
}

interface ProjetoResumo {
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  cliente_nome: string;
  margem_competencia_pct: number | null;
  data_inicio_real: string | null;
  data_fim_planejada: string | null;
  status_projeto: string | null;
  dias_restantes: number | null;
  progresso: number | null;
  status_visual: 'ok' | 'alerta' | 'critico';
  horas_previstas: number | null;
  horas_totais: number | null;
  desvio_horas_pct: number | null;
}

interface Pendencia {
  tipo: string;
  quantidade: number;
  prioridade: 'vermelho' | 'amarelo';
  label: string;
  link: string;
}

interface ColaboradorAtencao {
  id: string;
  nome: string;
  tipo: 'sem_alocacao' | 'conflito';
}

interface EquipeData {
  contadores: {
    ativos: number;
    alocados: number;
    disponiveis: number;
    sobrecarregados: number;
  };
  ocupacaoPct: number;
  listaAtencao: ColaboradorAtencao[];
}

interface FinanceiroData {
  valores: {
    faturado: number;
    aReceber: number;
    custoMO: number;
    margemPct: number | null;
  };
  aging: {
    aVencer: number;
    ate30: number;
    ate60: number;
    mais60: number;
  };
}

function getPeriodDates(periodo: Periodo) {
  const now = new Date();
  switch (periodo) {
    case 'semana':
      return { inicio: startOfWeek(now, { weekStartsOn: 1 }), fim: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'mes':
      return { inicio: startOfMonth(now), fim: endOfMonth(now) };
    case 'trimestre':
      return { inicio: startOfQuarter(now), fim: endOfQuarter(now) };
  }
}

export function useDashboardData(periodo: Periodo = 'mes') {
  const { inicio, fim } = getPeriodDates(periodo);
  const inicioPeriodo = inicio.toISOString().split('T')[0];
  const fimPeriodo = fim.toISOString().split('T')[0];

  // Query alertas críticos
  const alertasQuery = useQuery({
    queryKey: ['dashboard-alertas'],
    queryFn: async () => {
      const alertas: Alerta[] = [];

      // Projetos com prazo <= 15 dias
      const { count: prazoCritico } = await supabase
        .from('projetos')
        .select('*', { count: 'exact', head: true })
        .eq('status_projeto', 'ATIVO')
        .gte('data_fim_planejada', new Date().toISOString().split('T')[0])
        .lte('data_fim_planejada', new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (prazoCritico && prazoCritico > 0) {
        alertas.push({
          tipo: 'prazo_critico',
          quantidade: prazoCritico,
          prioridade: 'vermelho',
          label: `${prazoCritico} projeto(s) com prazo ≤ 15 dias`,
          link: '/projetos'
        });
      }

      // Projetos com margem negativa
      const { data: margemNegativa } = await supabase
        .from('vw_rentabilidade_projeto')
        .select('projeto_id')
        .eq('status_projeto', 'ATIVO')
        .lt('margem_competencia_pct', 0);

      if (margemNegativa && margemNegativa.length > 0) {
        alertas.push({
          tipo: 'margem_negativa',
          quantidade: margemNegativa.length,
          prioridade: 'vermelho',
          label: `${margemNegativa.length} projeto(s) com margem negativa`,
          link: '/rentabilidade'
        });
      }

      // Apontamentos não lançados
      const { count: apontamentosPendentes } = await supabase
        .from('apontamentos_consolidado')
        .select('*', { count: 'exact', head: true })
        .eq('status_apontamento', 'NAO_LANCADO');

      if (apontamentosPendentes && apontamentosPendentes > 0) {
        alertas.push({
          tipo: 'apontamentos_pendentes',
          quantidade: apontamentosPendentes,
          prioridade: 'amarelo',
          label: `${apontamentosPendentes} apontamento(s) não lançado(s)`,
          link: '/apontamentos-consolidado'
        });
      }

      // Títulos vencidos > 30 dias
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { count: titulosVencidos } = await supabase
        .from('omie_contas_receber')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ATRASADO')
        .lt('vencimento', thirtyDaysAgo);

      if (titulosVencidos && titulosVencidos > 0) {
        alertas.push({
          tipo: 'titulos_vencidos',
          quantidade: titulosVencidos,
          prioridade: 'amarelo',
          label: `${titulosVencidos} título(s) vencido(s) há mais de 30 dias`,
          link: '/rentabilidade'
        });
      }

      // Colaboradores sem custo vigente
      const { data: colaboradoresAtivos } = await supabase
        .from('collaborators')
        .select('id')
        .eq('status', 'ativo');

      const { data: custosVigentes } = await supabase
        .from('custos_colaborador')
        .select('colaborador_id')
        .lte('inicio_vigencia', new Date().toISOString().split('T')[0])
        .or(`fim_vigencia.is.null,fim_vigencia.gte.${new Date().toISOString().split('T')[0]}`);

      const colaboradoresComCusto = new Set(custosVigentes?.map(c => c.colaborador_id) || []);
      const semCusto = colaboradoresAtivos?.filter(c => !colaboradoresComCusto.has(c.id)) || [];

      if (semCusto.length > 0) {
        alertas.push({
          tipo: 'sem_custo',
          quantidade: semCusto.length,
          prioridade: 'amarelo',
          label: `${semCusto.length} colaborador(es) sem custo vigente`,
          link: '/recursos/custos'
        });
      }

      // Projetos pendentes de aprovação
      const { count: pendentesAprovacao } = await supabase
        .from('projetos')
        .select('*', { count: 'exact', head: true })
        .eq('aprovacao_status', 'PENDENTE_APROVACAO');

      if (pendentesAprovacao && pendentesAprovacao > 0) {
        alertas.push({
          tipo: 'pendente_aprovacao',
          quantidade: pendentesAprovacao,
          prioridade: 'amarelo',
          label: `${pendentesAprovacao} projeto(s) pendente(s) de aprovação`,
          link: '/aprovacoes-projetos'
        });
      }

      // Projetos com estouro de horas > 20%
      const { data: projetosHoras } = await supabase
        .from('vw_rentabilidade_projeto')
        .select('projeto_id, horas_previstas, horas_totais, desvio_horas_pct')
        .eq('status_projeto', 'ATIVO')
        .not('horas_previstas', 'is', null)
        .gt('horas_previstas', 0);

      const projetosComEstouro = projetosHoras?.filter(p => 
        p.desvio_horas_pct !== null && Number(p.desvio_horas_pct) > 20
      ) || [];

      if (projetosComEstouro.length > 0) {
        alertas.push({
          tipo: 'estouro_horas',
          quantidade: projetosComEstouro.length,
          prioridade: 'amarelo',
          label: `${projetosComEstouro.length} projeto(s) com estouro de horas > 20%`,
          link: '/rentabilidade'
        });
      }

      return alertas.sort((a, b) => {
        if (a.prioridade === 'vermelho' && b.prioridade !== 'vermelho') return -1;
        if (a.prioridade !== 'vermelho' && b.prioridade === 'vermelho') return 1;
        return 0;
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query projetos
  const projetosQuery = useQuery({
    queryKey: ['dashboard-projetos'],
    queryFn: async () => {
      const { data: projetos, error } = await supabase
        .from('vw_rentabilidade_projeto')
        .select('*')
        .eq('status_projeto', 'ATIVO');

      if (error) throw error;

      const hoje = new Date();
      
      const projetosProcessados: ProjetoResumo[] = (projetos || []).map(p => {
        const dataFim = p.data_fim_planejada ? new Date(p.data_fim_planejada) : null;
        const dataInicio = p.data_inicio_real 
          ? new Date(p.data_inicio_real) 
          : (p.data_inicio_planejada ? new Date(p.data_inicio_planejada) : null);
        
        const diasRestantes = dataFim ? differenceInDays(dataFim, hoje) : null;
        
        let progresso: number | null = null;
        if (dataInicio && dataFim) {
          const diasTotais = differenceInDays(dataFim, dataInicio);
          const diasDecorridos = differenceInDays(hoje, dataInicio);
          progresso = diasTotais > 0 ? Math.min(100, Math.max(0, (diasDecorridos / diasTotais) * 100)) : 0;
        }

        const margem = p.margem_competencia_pct;
        let status_visual: 'ok' | 'alerta' | 'critico' = 'ok';
        
        const diasParaAvaliar = diasRestantes ?? 999;
        const margemParaAvaliar = margem ?? 0;
        
        if (margemParaAvaliar < 0 || diasParaAvaliar < 0) {
          status_visual = 'critico';
        } else if (margemParaAvaliar < 20 || diasParaAvaliar <= 15) {
          status_visual = 'alerta';
        }

        return {
          projeto_id: p.projeto_id || '',
          projeto_nome: p.projeto_nome || '',
          projeto_os: p.projeto_os || '',
          cliente_nome: p.cliente_nome || '',
          margem_competencia_pct: margem,
          data_inicio_real: p.data_inicio_real,
          data_fim_planejada: p.data_fim_planejada,
          status_projeto: p.status_projeto,
          dias_restantes: diasRestantes,
          progresso,
          status_visual,
          horas_previstas: p.horas_previstas,
          horas_totais: p.horas_totais,
          desvio_horas_pct: p.desvio_horas_pct
        };
      });

      const ativos = projetosProcessados.length;
      const emDia = projetosProcessados.filter(p => p.status_visual === 'ok').length;
      const emAlerta = projetosProcessados.filter(p => p.status_visual === 'alerta').length;
      const critico = projetosProcessados.filter(p => p.status_visual === 'critico').length;

      const projetosOrdenados = [...projetosProcessados].sort((a, b) => {
        const ordem = { critico: 0, alerta: 1, ok: 2 };
        return ordem[a.status_visual] - ordem[b.status_visual];
      });

      return {
        contadores: { ativos, emDia, emAlerta, critico },
        projetos: projetosOrdenados.slice(0, 5)
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query equipe
  const equipeQuery = useQuery({
    queryKey: ['dashboard-equipe', periodo],
    queryFn: async (): Promise<EquipeData> => {
      // 1. Colaboradores ativos
      const { count: ativos } = await supabase
        .from('collaborators')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      // 2. Colaboradores alocados no período
      const { data: alocacoes } = await supabase
        .from('alocacoes_blocos')
        .select('colaborador_id, data_inicio')
        .lte('data_inicio', fimPeriodo)
        .gte('data_fim', inicioPeriodo);

      const alocadosUnicos = new Set(alocacoes?.map(a => a.colaborador_id) || []);
      const alocados = alocadosUnicos.size;
      const disponiveis = Math.max(0, (ativos || 0) - alocados);

      // 3. Colaboradores com conflito (múltiplas alocações no mesmo dia)
      const contagemPorDia = new Map<string, number>();
      alocacoes?.forEach(c => {
        const key = `${c.colaborador_id}_${c.data_inicio}`;
        contagemPorDia.set(key, (contagemPorDia.get(key) || 0) + 1);
      });

      const colaboradoresComConflito = new Set<string>();
      contagemPorDia.forEach((count, key) => {
        if (count > 1) {
          colaboradoresComConflito.add(key.split('_')[0]);
        }
      });

      // 4. Buscar nomes para lista de atenção
      const { data: colaboradoresAtivos } = await supabase
        .from('collaborators')
        .select('id, full_name')
        .eq('status', 'ativo');

      const listaAtencao: ColaboradorAtencao[] = [];

      // Com conflito primeiro (prioridade)
      for (const colab of colaboradoresAtivos || []) {
        if (colaboradoresComConflito.has(colab.id)) {
          listaAtencao.push({
            id: colab.id,
            nome: colab.full_name,
            tipo: 'conflito'
          });
        }
        if (listaAtencao.length >= 5) break;
      }

      // Sem alocação
      for (const colab of colaboradoresAtivos || []) {
        if (!alocadosUnicos.has(colab.id) && listaAtencao.length < 5) {
          listaAtencao.push({
            id: colab.id,
            nome: colab.full_name,
            tipo: 'sem_alocacao'
          });
        }
        if (listaAtencao.length >= 5) break;
      }

      return {
        contadores: {
          ativos: ativos || 0,
          alocados,
          disponiveis,
          sobrecarregados: colaboradoresComConflito.size
        },
        ocupacaoPct: ativos ? Math.round((alocados / ativos) * 100) : 0,
        listaAtencao: listaAtencao.slice(0, 5)
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query financeiro
  const financeiroQuery = useQuery({
    queryKey: ['dashboard-financeiro', periodo],
    queryFn: async (): Promise<FinanceiroData> => {
      const hoje = new Date().toISOString().split('T')[0];

      // 1. Faturado no período (títulos recebidos)
      const { data: faturados } = await supabase
        .from('omie_contas_receber')
        .select('valor_recebido')
        .in('status', ['PAGO', 'PARCIAL'])
        .gte('data_recebimento', inicioPeriodo)
        .lte('data_recebimento', fimPeriodo);

      const faturado = faturados?.reduce((sum, t) => sum + (t.valor_recebido || 0), 0) || 0;

      // 2. A Receber (títulos abertos)
      const { data: abertos } = await supabase
        .from('omie_contas_receber')
        .select('valor, valor_recebido')
        .in('status', ['ABERTO', 'ATRASADO']);

      const aReceber = abertos?.reduce((sum, t) => 
        sum + ((t.valor || 0) - (t.valor_recebido || 0)), 0) || 0;

      // 3. Custo MO do período (soma da view)
      const { data: rentabilidade } = await supabase
        .from('vw_rentabilidade_projeto')
        .select('custo_mao_obra')
        .eq('status_projeto', 'ATIVO');

      const custoMO = rentabilidade?.reduce((sum, p) => 
        sum + (p.custo_mao_obra || 0), 0) || 0;

      // 4. Margem
      const margemPct = faturado > 0 
        ? ((faturado - custoMO) / faturado) * 100 
        : null;

      // 5. Aging por faixa
      const { data: titulosAbertos } = await supabase
        .from('omie_contas_receber')
        .select('vencimento, valor, valor_recebido')
        .in('status', ['ABERTO', 'ATRASADO']);

      const aging = { aVencer: 0, ate30: 0, ate60: 0, mais60: 0 };

      titulosAbertos?.forEach(t => {
        const saldo = (t.valor || 0) - (t.valor_recebido || 0);
        const diasVencido = differenceInDays(new Date(), new Date(t.vencimento));

        if (diasVencido < 0) aging.aVencer += saldo;
        else if (diasVencido <= 30) aging.ate30 += saldo;
        else if (diasVencido <= 60) aging.ate60 += saldo;
        else aging.mais60 += saldo;
      });

      return {
        valores: { faturado, aReceber, custoMO, margemPct },
        aging
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query pendências (ações pendentes)
  const pendenciasQuery = useQuery({
    queryKey: ['dashboard-pendencias'],
    queryFn: async () => {
      const pendencias: Pendencia[] = [];

      // Apontamentos não lançados
      const { count: apontamentos } = await supabase
        .from('apontamentos_consolidado')
        .select('*', { count: 'exact', head: true })
        .eq('status_apontamento', 'NAO_LANCADO');

      if (apontamentos && apontamentos > 0) {
        pendencias.push({
          tipo: 'apontamentos',
          quantidade: apontamentos,
          prioridade: 'amarelo',
          label: 'Apontamentos não lançados',
          link: '/apontamentos-consolidado'
        });
      }

      // Projetos pendentes de aprovação
      const { count: aprovacoes } = await supabase
        .from('projetos')
        .select('*', { count: 'exact', head: true })
        .eq('aprovacao_status', 'PENDENTE_APROVACAO');

      if (aprovacoes && aprovacoes > 0) {
        pendencias.push({
          tipo: 'aprovacoes',
          quantidade: aprovacoes,
          prioridade: 'amarelo',
          label: 'Projetos pendentes de aprovação',
          link: '/aprovacoes-projetos'
        });
      }

      // Colaboradores sem custo vigente
      const { data: colaboradoresAtivos } = await supabase
        .from('collaborators')
        .select('id')
        .eq('status', 'ativo');

      const { data: custosVigentes } = await supabase
        .from('custos_colaborador')
        .select('colaborador_id')
        .lte('inicio_vigencia', new Date().toISOString().split('T')[0])
        .or(`fim_vigencia.is.null,fim_vigencia.gte.${new Date().toISOString().split('T')[0]}`);

      const colaboradoresComCusto = new Set(custosVigentes?.map(c => c.colaborador_id) || []);
      const semCusto = colaboradoresAtivos?.filter(c => !colaboradoresComCusto.has(c.id)) || [];

      if (semCusto.length > 0) {
        pendencias.push({
          tipo: 'custos',
          quantidade: semCusto.length,
          prioridade: 'amarelo',
          label: 'Colaboradores sem custo vigente',
          link: '/recursos/custos'
        });
      }

      // Projetos não sincronizados com Omie
      const { count: naoSincronizados } = await supabase
        .from('projetos')
        .select('*', { count: 'exact', head: true })
        .eq('omie_sync_status', 'NOT_SENT');

      if (naoSincronizados && naoSincronizados > 0) {
        pendencias.push({
          tipo: 'omie',
          quantidade: naoSincronizados,
          prioridade: 'amarelo',
          label: 'Projetos não sincronizados com Omie',
          link: '/projetos'
        });
      }

      // Projetos com margem negativa (prioridade vermelha)
      const { data: margemNegativa } = await supabase
        .from('vw_rentabilidade_projeto')
        .select('projeto_id')
        .eq('status_projeto', 'ATIVO')
        .lt('margem_competencia_pct', 0);

      if (margemNegativa && margemNegativa.length > 0) {
        pendencias.push({
          tipo: 'margem',
          quantidade: margemNegativa.length,
          prioridade: 'vermelho',
          label: 'Projetos com margem negativa',
          link: '/rentabilidade'
        });
      }

      // Títulos vencidos > 60 dias (prioridade vermelha)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { count: titulosVencidos60 } = await supabase
        .from('omie_contas_receber')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ATRASADO')
        .lt('vencimento', sixtyDaysAgo);

      if (titulosVencidos60 && titulosVencidos60 > 0) {
        pendencias.push({
          tipo: 'titulos',
          quantidade: titulosVencidos60,
          prioridade: 'vermelho',
          label: 'Títulos vencidos há mais de 60 dias',
          link: '/rentabilidade'
        });
      }

      return pendencias.sort((a, b) => {
        if (a.prioridade === 'vermelho' && b.prioridade !== 'vermelho') return -1;
        if (a.prioridade !== 'vermelho' && b.prioridade === 'vermelho') return 1;
        return 0;
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    alertas: alertasQuery,
    projetos: projetosQuery,
    equipe: equipeQuery,
    financeiro: financeiroQuery,
    pendencias: pendenciasQuery,
    periodo: { inicio, fim },
    isLoading: alertasQuery.isLoading || projetosQuery.isLoading || equipeQuery.isLoading || financeiroQuery.isLoading || pendenciasQuery.isLoading,
    refetchAll: () => {
      alertasQuery.refetch();
      projetosQuery.refetch();
      equipeQuery.refetch();
      financeiroQuery.refetch();
      pendenciasQuery.refetch();
    }
  };
}
