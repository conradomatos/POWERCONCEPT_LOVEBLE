/**
 * Servico de sincronizacao com Secullum Ponto Web.
 * Invoca a Edge Function secullum-sync via supabase.functions.invoke().
 */
import { supabase } from '@/integrations/supabase/client';
import type { SecullumSyncParams, SecullumSyncResult } from './types';

/**
 * Dispara sincronizacao com o Secullum Ponto Web.
 * @param params Parametros de sync (tipo, periodo, colaboradores)
 * @returns Resultado da sincronizacao
 */
export async function syncSecullum(params: SecullumSyncParams): Promise<SecullumSyncResult> {
  const { data, error } = await supabase.functions.invoke('secullum-sync', {
    body: params,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || 'Erro ao sincronizar com Secullum',
    };
  }

  return data as SecullumSyncResult;
}
