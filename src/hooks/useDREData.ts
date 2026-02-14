import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DREDadosMes {
  conta_dre: string;
  mes: number;
  ano: number;
  total: number;
}

export interface DREUnmappedInfo {
  categoria: string;
  tipo: 'AR' | 'AP';
  count: number;
  total: number;
}

export interface DREResult {
  dados: DREDadosMes[];
  unmapped: DREUnmappedInfo[];
}

// Fallback para AP baseado no prefixo do código Omie
function fallbackAP(cat?: string): string {
  if (!cat) return '(-) - Despesas Administrativas';
  if (cat.startsWith('1.')) return '(-) - Custo dos Serviços Prestados';
  if (cat.startsWith('2.01') || cat.startsWith('2.02')) return '(-) - Despesas com Pessoal';
  if (cat.startsWith('2.05')) return '(-) - Despesas de Vendas e Marketing';
  if (cat.startsWith('2.03') || cat.startsWith('2.04') || cat.startsWith('2.06')) return '(-) - Despesas Administrativas';
  if (cat.startsWith('3.')) return '(-) - Despesas Financeiras';
  return '(-) - Despesas Administrativas';
}

function parseRateio(raw: any): any[] | null {
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? parsed : null;
}

function trackUnmapped(tracker: Map<string, DREUnmappedInfo>, cat: string, tipo: 'AR' | 'AP', valor: number) {
  const ukey = `${cat}|${tipo}`;
  const existing = tracker.get(ukey);
  if (existing) { existing.count++; existing.total += valor; }
  else { tracker.set(ukey, { categoria: cat, tipo, count: 1, total: valor }); }
}

export function useDREData(ano: number) {
  return useQuery({
    queryKey: ['dre-data', ano],
    queryFn: async (): Promise<DREResult> => {
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

      // 2. Buscar AR e AP do ano
      const [{ data: receber }, { data: pagar }] = await Promise.all([
        supabase
          .from('omie_contas_receber')
          .select('data_emissao, valor, categoria, categorias_rateio, valor_inss, valor_ir, valor_iss, valor_pis, valor_cofins, valor_csll, status')
          .gte('data_emissao', `${ano}-01-01`)
          .lte('data_emissao', `${ano}-12-31`)
          .neq('status', 'CANCELADO'),
        supabase
          .from('omie_contas_pagar')
          .select('data_emissao, valor, categoria, categorias_rateio, valor_inss, valor_ir, valor_iss, valor_pis, valor_cofins, valor_csll, status')
          .gte('data_emissao', `${ano}-01-01`)
          .lte('data_emissao', `${ano}-12-31`)
          .neq('status', 'CANCELADO'),
      ]);

      const acumulador = new Map<string, number>();
      const unmappedTracker = new Map<string, DREUnmappedInfo>();

      const acumular = (contaDre: string, mes: number, valor: number) => {
        const key = `${contaDre}|${mes}`;
        acumulador.set(key, (acumulador.get(key) || 0) + valor);
      };

      // ===== AR (RECEITA) =====
      receber?.forEach(titulo => {
        if (!titulo.data_emissao) return;
        const mes = new Date(titulo.data_emissao).getMonth() + 1;

        const rateio = parseRateio(titulo.categorias_rateio);
        if (rateio) {
          for (const rat of rateio) {
            const contaDre = mapaCat.get(rat.codigo_categoria);
            if (contaDre) {
              acumular(contaDre, mes, rat.valor || 0);
            } else {
              acumular('(+) - Receita Bruta de Vendas', mes, rat.valor || 0);
              if (rat.codigo_categoria) trackUnmapped(unmappedTracker, rat.codigo_categoria, 'AR', rat.valor || 0);
            }
          }
        } else if (titulo.categoria) {
          const contaDre = mapaCat.get(titulo.categoria);
          if (contaDre) {
            acumular(contaDre, mes, titulo.valor || 0);
          } else {
            acumular('(+) - Receita Bruta de Vendas', mes, titulo.valor || 0);
            trackUnmapped(unmappedTracker, titulo.categoria, 'AR', titulo.valor || 0);
          }
        } else {
          acumular('(+) - Receita Bruta de Vendas', mes, titulo.valor || 0);
        }

        // Impostos retidos de AR → Deduções de Receita
        const totalImpostos = (titulo.valor_inss || 0) + (titulo.valor_ir || 0) +
          (titulo.valor_iss || 0) + (titulo.valor_pis || 0) +
          (titulo.valor_cofins || 0) + (titulo.valor_csll || 0);
        if (totalImpostos > 0) {
          acumular('(-) - Deduções de Receita', mes, totalImpostos);
        }
      });

      // ===== AP (DESPESA/CUSTO) =====
      pagar?.forEach(titulo => {
        if (!titulo.data_emissao) return;
        const mes = new Date(titulo.data_emissao).getMonth() + 1;

        const rateio = parseRateio(titulo.categorias_rateio);
        if (rateio) {
          for (const rat of rateio) {
            const contaDre = mapaCat.get(rat.codigo_categoria) || fallbackAP(rat.codigo_categoria);
            acumular(contaDre, mes, rat.valor || 0);
            if (!mapaCat.has(rat.codigo_categoria) && rat.codigo_categoria) {
              trackUnmapped(unmappedTracker, rat.codigo_categoria, 'AP', rat.valor || 0);
            }
          }
        } else if (titulo.categoria) {
          const contaDre = mapaCat.get(titulo.categoria) || fallbackAP(titulo.categoria);
          acumular(contaDre, mes, titulo.valor || 0);
          if (!mapaCat.has(titulo.categoria)) {
            trackUnmapped(unmappedTracker, titulo.categoria, 'AP', titulo.valor || 0);
          }
        } else {
          acumular('(-) - Despesas Administrativas', mes, titulo.valor || 0);
        }
        // Impostos retidos de AP → NÃO processados separadamente
      });

      // Converter em array
      const dados: DREDadosMes[] = [];
      acumulador.forEach((total, key) => {
        const [conta_dre, mesStr] = key.split('|');
        dados.push({ conta_dre, mes: Number(mesStr), ano, total });
      });

      return {
        dados,
        unmapped: Array.from(unmappedTracker.values()),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
