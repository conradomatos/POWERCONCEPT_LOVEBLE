/**
 * Tipos para integracao Secullum Ponto Web
 */

/** Tipo de afastamento classificado */
export type TipoAfastamento = 'FERIAS' | 'ATESTADO' | 'LICENCA' | 'OUTRO';

/** Tipo de dia calculado pelo Secullum */
export type TipoDia = 'NORMAL' | 'FERIAS' | 'FOLGA' | 'ATESTADO' | 'FERIADO' | 'SEM_MARCACAO';

/** Resultado da invocacao da Edge Function */
export interface SecullumSyncResult {
  ok: boolean;
  data?: {
    funcionarios?: {
      sincronizados: number;
      criados: number;
      atualizados: number;
      ignorados: number;
    };
    fotos?: { sincronizadas: number };
    afastamentos?: { sincronizados: number };
    calculos?: { sincronizados: number };
    apontamentos?: { criados: number; atualizados: number };
  };
  error?: string;
  message?: string;
}

/** Parametros para sync */
export interface SecullumSyncParams {
  tipo: 'CRON' | 'MANUAL';
  dataInicio?: string;
  dataFim?: string;
  colaboradorIds?: string[];
}

/** Registro de calculo (espelho de secullum_calculos) */
export interface SecullumCalculo {
  id: string;
  colaborador_id: string;
  data: string;
  horas_normais: number;
  horas_faltas: number;
  horas_extra_50: number;
  horas_extra_100: number;
  horas_extra_0: number;
  horas_noturnas: number;
  horas_extra_noturna: number;
  horas_atraso: number;
  horas_ajuste: number;
  horas_folga: number;
  carga_horaria: number;
  dsr: number;
  dsr_debito: number;
  total_horas_trabalhadas: number | null;
  tipo_dia: TipoDia;
  batidas_json: Record<string, string> | null;
  extras_json: Record<string, string> | null;
}

/** Registro de afastamento (espelho de secullum_afastamentos) */
export interface SecullumAfastamento {
  id: string;
  colaborador_id: string;
  data_inicio: string;
  data_fim: string;
  motivo: string | null;
  justificativa_nome: string | null;
  tipo: TipoAfastamento;
  created_at: string;
}

/** Registro de log de sync (espelho de secullum_sync_log) */
export interface SecullumSyncLog {
  id: string;
  tipo: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  funcionarios_sincronizados: number;
  funcionarios_criados: number;
  funcionarios_atualizados: number;
  calculos_sincronizados: number;
  afastamentos_sincronizados: number;
  fotos_sincronizadas: number;
  apontamentos_criados: number;
  requests_utilizadas: number;
  erro_mensagem: string | null;
  duracao_ms: number | null;
  triggered_by: string | null;
  created_at: string;
}

/** Linha da view vw_apontamentos_pendentes */
export interface ApontamentoPendente {
  apontamento_dia_id: string;
  colaborador_id: string;
  colaborador_nome: string;
  cpf: string;
  departamento: string | null;
  foto_url: string | null;
  data: string;
  horas_base_dia: number;
  total_horas_apontadas: number;
  horas_pendentes: number;
  status: string;
  fonte_base: string;
  horas_normais: number | null;
  horas_extra_50: number | null;
  horas_extra_100: number | null;
  horas_noturnas: number | null;
  tipo_dia: string | null;
  tipo_afastamento: string | null;
}
