/**
 * IDs dos projetos de sistema usados para apontamento automatico
 * de dias nao produtivos (ferias, afastamentos, etc.)
 *
 * Correspondem a registros na tabela `projetos` com `is_sistema = true`.
 */
export const PROJETO_SYS = {
  FERIAS:         'cc5da047-102e-4592-9c84-e3d0ec059739',
  AFASTAMENTO:    '85a4e4c2-4ad1-4f4a-8e41-3675b69a25a9',
  TREINAMENTO:    '2e1e0f1a-b0f4-470f-91b1-4b5dc7014529',
  ADMINISTRATIVO: '95dcd7fd-4ea2-4312-8f42-76d8e6fbe1a9',
} as const;

/** Mapeamento tipo de afastamento → projeto de sistema */
export const AFASTAMENTO_PROJETO_MAP: Record<string, string> = {
  FERIAS:    PROJETO_SYS.FERIAS,
  ATESTADO:  PROJETO_SYS.AFASTAMENTO,
  LICENCA:   PROJETO_SYS.AFASTAMENTO,
};

/** Cores Tailwind por tipo de afastamento */
export const AFASTAMENTO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FERIAS:    { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-800 dark:text-blue-300',   border: 'border-blue-300' },
  ATESTADO:  { bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-800 dark:text-red-300',     border: 'border-red-300' },
  LICENCA:   { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300' },
  OUTRO:     { bg: 'bg-gray-100 dark:bg-gray-900/30',   text: 'text-gray-800 dark:text-gray-300',   border: 'border-gray-300' },
};

/** Labels amigaveis por tipo de dia */
export const TIPO_DIA_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  FERIAS: 'Férias',
  FOLGA: 'Folga',
  ATESTADO: 'Atestado',
  FERIADO: 'Feriado',
  SEM_MARCACAO: 'Sem Marcação',
};
