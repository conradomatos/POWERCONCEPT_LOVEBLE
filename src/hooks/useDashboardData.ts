import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

export type Periodo = 'semana' | 'mes' | 'trimestre';

interface Alerta {
  tipo: 'prazo_critico' | 'margem_negativa' | 'apontamentos_pendentes' | 'titulos_vencidos' | 'sem_custo' | 'pendente_aprovacao';
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
}

interface Pendencia {
  tipo: string;
  quantidade: number;
  prioridade: 'vermelho' | 'amarelo';
  label: string;
  link: string;
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

      return alertas.sort((a, b) => {
        if (a.prioridade === 'vermelho' && b.prioridade !== 'vermelho') return -1;
        if (a.prioridade !== 'vermelho' && b.prioridade === 'vermelho') return 1;
        return 0;
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
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
        // Usar data_inicio_real, se não existir usar data_inicio_planejada
        const dataInicio = p.data_inicio_real 
          ? new Date(p.data_inicio_real) 
          : (p.data_inicio_planejada ? new Date(p.data_inicio_planejada) : null);
        
        // Se não tem data_fim, retorna null para mostrar "-"
        const diasRestantes = dataFim ? differenceInDays(dataFim, hoje) : null;
        
        let progresso: number | null = null;
        if (dataInicio && dataFim) {
          const diasTotais = differenceInDays(dataFim, dataInicio);
          const diasDecorridos = differenceInDays(hoje, dataInicio);
          progresso = diasTotais > 0 ? Math.min(100, Math.max(0, (diasDecorridos / diasTotais) * 100)) : 0;
        }

        // margem_competencia_pct pode ser 0 (válido) ou null (sem dados)
        const margem = p.margem_competencia_pct;
        let status_visual: 'ok' | 'alerta' | 'critico' = 'ok';
        
        // Se diasRestantes é null, não podemos avaliar prazo
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
          status_visual
        };
      });

      const ativos = projetosProcessados.length;
      const emDia = projetosProcessados.filter(p => p.status_visual === 'ok').length;
      const emAlerta = projetosProcessados.filter(p => p.status_visual === 'alerta').length;
      const critico = projetosProcessados.filter(p => p.status_visual === 'critico').length;

      // Ordenar por criticidade (críticos primeiro, depois alerta, depois ok)
      const projetosOrdenados = [...projetosProcessados].sort((a, b) => {
        const ordem = { critico: 0, alerta: 1, ok: 2 };
        return ordem[a.status_visual] - ordem[b.status_visual];
      });

      return {
        contadores: { ativos, emDia, emAlerta, critico },
        projetos: projetosOrdenados.slice(0, 5) // Top 5 mais críticos
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
    pendencias: pendenciasQuery,
    periodo: { inicio, fim },
    isLoading: alertasQuery.isLoading || projetosQuery.isLoading || pendenciasQuery.isLoading,
    refetchAll: () => {
      alertasQuery.refetch();
      projetosQuery.refetch();
      pendenciasQuery.refetch();
    }
  };
}
