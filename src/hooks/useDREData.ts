import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DREDadosMes {
  conta_dre: string;
  mes: number;
  ano: number;
  total: number;
}

export function useDREData(ano: number) {
  return useQuery({
    queryKey: ['dre-data', ano],
    queryFn: async (): Promise<DREDadosMes[]> => {
      // 1. Buscar mapeamento de categorias Omie → conta_dre
      const { data: mapeamentos } = await supabase
        .from('omie_categoria_mapeamento')
        .select('codigo_omie, conta_dre_override, categoria_contabil_id, categorias_contabeis(conta_dre)')
        .eq('ativo', true);

      const mapaCat = new Map<string, string>();
      mapeamentos?.forEach((m: any) => {
        const contaDre = m.conta_dre_override || m.categorias_contabeis?.conta_dre;
        if (contaDre) mapaCat.set(m.codigo_omie, contaDre);
      });

      // 2. Buscar Contas a Receber do ano
      const { data: receber } = await supabase
        .from('omie_contas_receber')
        .select('data_emissao, valor, categoria, categorias_rateio, valor_inss, valor_ir, valor_iss, valor_pis, valor_cofins, valor_csll, status')
        .gte('data_emissao', `${ano}-01-01`)
        .lte('data_emissao', `${ano}-12-31`)
        .neq('status', 'CANCELADO');

      // 3. Buscar Contas a Pagar do ano
      const { data: pagar } = await supabase
        .from('omie_contas_pagar')
        .select('data_emissao, valor, categoria, categorias_rateio, valor_inss, valor_ir, valor_iss, valor_pis, valor_cofins, valor_csll, status')
        .gte('data_emissao', `${ano}-01-01`)
        .lte('data_emissao', `${ano}-12-31`)
        .neq('status', 'CANCELADO');

      // 4. Agregar por conta_dre e mês
      const acumulador = new Map<string, number>();

      const processarTitulo = (titulo: any) => {
        if (!titulo.data_emissao) return;
        const dataEmissao = new Date(titulo.data_emissao);
        const mes = dataEmissao.getMonth() + 1;

        // Se tem rateio, usar categorias_rateio
        if (titulo.categorias_rateio && Array.isArray(titulo.categorias_rateio)) {
          for (const rat of titulo.categorias_rateio) {
            const contaDre = mapaCat.get(rat.codigo_categoria);
            if (contaDre) {
              const key = `${contaDre}|${mes}`;
              acumulador.set(key, (acumulador.get(key) || 0) + (rat.valor || 0));
            }
          }
        } else if (titulo.categoria) {
          const contaDre = mapaCat.get(titulo.categoria);
          if (contaDre) {
            const key = `${contaDre}|${mes}`;
            acumulador.set(key, (acumulador.get(key) || 0) + (titulo.valor || 0));
          }
        }

        // Impostos retidos → conta "(-) - Deduções de Receita"
        const totalImpostos =
          (titulo.valor_inss || 0) + (titulo.valor_ir || 0) +
          (titulo.valor_iss || 0) + (titulo.valor_pis || 0) +
          (titulo.valor_cofins || 0) + (titulo.valor_csll || 0);
        if (totalImpostos > 0) {
          const key = `(-) - Deduções de Receita|${mes}`;
          acumulador.set(key, (acumulador.get(key) || 0) + totalImpostos);
        }
      };

      receber?.forEach(processarTitulo);
      pagar?.forEach(processarTitulo);

      // Converter em array
      const resultado: DREDadosMes[] = [];
      acumulador.forEach((total, key) => {
        const [conta_dre, mesStr] = key.split('|');
        resultado.push({ conta_dre, mes: Number(mesStr), ano, total });
      });

      return resultado;
    },
    staleTime: 5 * 60 * 1000,
  });
}
