import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiaApontamento {
  data: string;
  horasSecullum: number;
  horasApontadas: number;
  horasPendentes: number;
  status: 'CONCILIADO' | 'PENDENTE' | 'DIVERGENTE' | 'AUTO' | 'FOLGA' | 'SEM_MARCACAO';
  tipoDia: string | null;
  tipoAfastamento: string | null;
  apontamentoDiaId: string | null;
}

/**
 * Hook para buscar dados de apontamento de um colaborador em um mês inteiro.
 * Cruza secullum_calculos + apontamento_dia + SUM(apontamento_item.horas) por dia.
 */
export function useApontamentoPeriodo(colaboradorId?: string, mesAno?: string) {
  const { data: dias = [], isLoading } = useQuery({
    queryKey: ['apontamento-periodo', colaboradorId, mesAno],
    queryFn: async () => {
      if (!colaboradorId || !mesAno) return [];

      const [ano, mes] = mesAno.split('-').map(Number);
      const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

      // Buscar dados do Secullum (cálculos)
      const { data: calculos } = await supabase
        .from('secullum_calculos')
        .select('data, total_horas_trabalhadas, horas_normais, tipo_dia')
        .eq('colaborador_id', colaboradorId)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data');

      // Buscar apontamento_dia (dados base do ponto)
      const { data: apontamentoDias } = await supabase
        .from('apontamento_dia')
        .select('id, data, horas_base_dia, status, fonte_base, tipo_afastamento')
        .eq('colaborador_id', colaboradorId)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data');

      // Buscar soma de horas apontadas por dia (apontamento_item)
      const { data: apontamentoItems } = await supabase
        .from('apontamento_item')
        .select('horas, apontamento_dia!inner(data, colaborador_id)')
        .eq('apontamento_dia.colaborador_id', colaboradorId)
        .gte('apontamento_dia.data', dataInicio)
        .lte('apontamento_dia.data', dataFim);

      // Agrupar horas apontadas por data
      const horasApontadasPorDia = new Map<string, number>();
      for (const item of apontamentoItems || []) {
        const d = (item as any).apontamento_dia?.data;
        if (d) {
          horasApontadasPorDia.set(d, (horasApontadasPorDia.get(d) || 0) + (item.horas || 0));
        }
      }

      // Maps para lookup rápido
      const calculoMap = new Map((calculos || []).map(c => [c.data, c]));
      const apontDiaMap = new Map((apontamentoDias || []).map(a => [a.data, a]));

      // Montar resultado por dia
      const resultado: DiaApontamento[] = [];
      const allDatas = new Set<string>();
      calculos?.forEach(c => allDatas.add(c.data));
      apontamentoDias?.forEach(a => allDatas.add(a.data));

      for (const data of Array.from(allDatas).sort()) {
        const calc = calculoMap.get(data);
        const aptDia = apontDiaMap.get(data);
        const horasApt = horasApontadasPorDia.get(data) || 0;

        const horasSecullum = calc?.total_horas_trabalhadas ?? aptDia?.horas_base_dia ?? 0;
        const tipoDia = calc?.tipo_dia || null;
        const tipoAfastamento = aptDia?.tipo_afastamento || null;

        // Determinar status
        let status: DiaApontamento['status'];
        if (tipoDia === 'FOLGA') {
          status = 'FOLGA';
        } else if (tipoDia === 'SEM_MARCACAO' || (horasSecullum === 0 && !tipoAfastamento)) {
          status = 'SEM_MARCACAO';
        } else if (tipoAfastamento === 'FERIAS' || tipoAfastamento === 'ATESTADO') {
          status = 'AUTO';
        } else if (aptDia?.status === 'CONCILIADO' || (horasSecullum > 0 && horasApt >= horasSecullum)) {
          status = 'CONCILIADO';
        } else if (aptDia?.status === 'DIVERGENTE') {
          status = 'DIVERGENTE';
        } else {
          status = 'PENDENTE';
        }

        resultado.push({
          data,
          horasSecullum,
          horasApontadas: horasApt,
          horasPendentes: Math.max(0, horasSecullum - horasApt),
          status,
          tipoDia,
          tipoAfastamento,
          apontamentoDiaId: aptDia?.id || null,
        });
      }

      return resultado;
    },
    enabled: !!colaboradorId && !!mesAno,
  });

  return { dias, isLoading };
}
