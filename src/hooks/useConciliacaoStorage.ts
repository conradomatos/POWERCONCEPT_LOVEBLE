import { supabase } from '@/integrations/supabase/client';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, CartaoInfo } from '@/lib/conciliacao/types';

interface SaveImportParams {
  tipo: 'extrato_banco' | 'extrato_omie' | 'fatura_cartao';
  periodoRef: string;
  periodoInicio?: string;
  periodoFim?: string;
  nomeArquivo: string;
  totalLancamentos: number;
  valorTotal: number;
  saldoAnterior?: number;
  dados: any[];
  metadata?: any;
}

export interface LoadedImport {
  id: string;
  tipo: string;
  periodo_ref: string;
  nome_arquivo: string;
  total_lancamentos: number;
  valor_total: number;
  saldo_anterior: number | null;
  dados: any;
  metadata: any;
}

// Reconstruct Date objects from ISO strings in JSONB
function rehydrateDates<T extends { data?: any; dataStr?: string }>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    data: item.data ? new Date(item.data) : new Date(),
  }));
}

export function rehydrateBanco(dados: any[]): LancamentoBanco[] {
  return rehydrateDates(dados) as LancamentoBanco[];
}

export function rehydrateOmie(dados: any[]): LancamentoOmie[] {
  return rehydrateDates(dados) as LancamentoOmie[];
}

export function rehydrateCartao(dados: any[]): TransacaoCartao[] {
  return rehydrateDates(dados) as TransacaoCartao[];
}

export function useConciliacaoStorage() {

  async function saveImport(params: SaveImportParams) {
    // 1. Mark previous imports of same tipo+periodo as 'substituido'
    await supabase
      .from('conciliacao_imports')
      .update({ status: 'substituido', updated_at: new Date().toISOString() } as any)
      .eq('tipo', params.tipo)
      .eq('periodo_ref', params.periodoRef)
      .eq('status', 'ativo');

    // 2. Insert new import as 'ativo'
    const { data, error } = await supabase
      .from('conciliacao_imports')
      .insert({
        tipo: params.tipo,
        periodo_ref: params.periodoRef,
        periodo_inicio: params.periodoInicio || null,
        periodo_fim: params.periodoFim || null,
        status: 'ativo',
        nome_arquivo: params.nomeArquivo,
        total_lancamentos: params.totalLancamentos,
        valor_total: params.valorTotal,
        saldo_anterior: params.saldoAnterior ?? null,
        dados: params.dados as any,
        metadata: params.metadata || null,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function loadImports(periodoRef: string): Promise<{
    extratoBanco: LoadedImport | null;
    extratoOmie: LoadedImport | null;
    faturaCartao: LoadedImport | null;
  }> {
    const { data, error } = await supabase
      .from('conciliacao_imports')
      .select('*')
      .eq('periodo_ref', periodoRef)
      .eq('status', 'ativo')
      .order('tipo');

    if (error) throw error;

    const items = (data || []) as unknown as LoadedImport[];
    return {
      extratoBanco: items.find(d => d.tipo === 'extrato_banco') || null,
      extratoOmie: items.find(d => d.tipo === 'extrato_omie') || null,
      faturaCartao: items.find(d => d.tipo === 'fatura_cartao') || null,
    };
  }

  async function deleteImport(tipo: string, periodoRef: string) {
    const { error } = await supabase
      .from('conciliacao_imports')
      .update({ status: 'substituido', updated_at: new Date().toISOString() } as any)
      .eq('tipo', tipo)
      .eq('periodo_ref', periodoRef)
      .eq('status', 'ativo');

    if (error) throw error;
  }

  return { saveImport, loadImports, deleteImport };
}
