// Types for the Orçamentos (Budgets) module

export type RevisionStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELED';
export type WbsType = 'CHAPTER' | 'PACKAGE' | 'ACTIVITY';
export type SupplyType = 'CONCEPT' | 'CLIENTE' | 'TERCEIRO' | 'A_DEFINIR';
export type LaborModality = 'CLT' | 'PACOTE';
export type HhOrigin = 'MATERIAIS' | 'MANUAL';
export type EngType = 'HH' | 'FECHADO';
export type TaxValueType = 'PERCENT' | 'FIXED';
export type TaxBase = 'SALE' | 'COST';
export type TaxScope = 'ALL' | 'MATERIALS' | 'SERVICES';
export type GenStatus = 'PENDENTE' | 'APLICADO';

export interface Budget {
  id: string;
  budget_number: string;
  cliente_id: string;
  obra_nome: string;
  local?: string;
  responsavel_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithRelations extends Budget {
  cliente?: {
    id: string;
    empresa: string;
    codigo: string;
  };
  responsavel?: {
    id: string;
    full_name: string;
    email: string;
  };
  latest_revision?: BudgetRevision;
}

export interface BudgetRevision {
  id: string;
  budget_id: string;
  revision_number: number;
  status: RevisionStatus;
  validade_proposta?: string;
  prazo_execucao_meses?: number;
  observacoes?: string;
  premissas?: string;
  exclusoes?: string;
  condicoes_pagamento?: string;
  created_at: string;
  created_by: string;
  sent_at?: string;
  approved_at?: string;
  approved_by?: string;
  projeto_id?: string;
}

export interface BudgetWbs {
  id: string;
  revision_id: string;
  code: string;
  nome: string;
  parent_id?: string;
  ordem: number;
  tipo: WbsType;
  children?: BudgetWbs[];
}

export interface MaterialCatalog {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_ref?: number;
  hh_unit_ref?: number;
  categoria?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetMaterialItem {
  id: string;
  revision_id: string;
  wbs_id?: string;
  item_seq: number;
  codigo?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  fornecimento: SupplyType;
  hh_unitario: number;
  fator_dificuldade: number;
  hh_total: number;
  preco_unit: number;
  preco_total: number;
  observacao?: string;
}

export interface BudgetSummary {
  id: string;
  revision_id: string;
  total_materiais: number;
  total_hh_materiais: number;
  total_mo: number;
  total_equipamentos: number;
  total_engenharia: number;
  total_mobilizacao: number;
  total_canteiro: number;
  subtotal_custo: number;
  markup_pct_aplicado: number;
  valor_markup: number;
  total_impostos: number;
  preco_venda: number;
  margem_rs: number;
  margem_pct: number;
  updated_at: string;
}

// Form types
export interface BudgetFormData {
  budget_number?: string;
  cliente_id: string;
  obra_nome: string;
  local?: string;
}

export interface RevisionFormData {
  validade_proposta?: string;
  prazo_execucao_meses?: number;
  observacoes?: string;
  premissas?: string;
  exclusoes?: string;
  condicoes_pagamento?: string;
}

// Status configuration
export const REVISION_STATUS_CONFIG: Record<RevisionStatus, { label: string; color: string; icon: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800', icon: 'FileEdit' },
  SENT: { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: 'Send' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-800', icon: 'CheckCircle' },
  REJECTED: { label: 'Reprovada', color: 'bg-red-100 text-red-800', icon: 'XCircle' },
  CANCELED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800', icon: 'Ban' },
};

export const SUPPLY_TYPE_CONFIG: Record<SupplyType, { label: string; color: string }> = {
  CONCEPT: { label: 'Concept', color: 'bg-primary/10 text-primary' },
  CLIENTE: { label: 'Cliente', color: 'bg-blue-100 text-blue-800' },
  TERCEIRO: { label: 'Terceiro', color: 'bg-purple-100 text-purple-800' },
  A_DEFINIR: { label: 'A Definir', color: 'bg-gray-100 text-gray-600' },
};

export const WBS_TYPE_CONFIG: Record<WbsType, { label: string; icon: string }> = {
  CHAPTER: { label: 'Capítulo', icon: 'BookOpen' },
  PACKAGE: { label: 'Pacote', icon: 'Package' },
  ACTIVITY: { label: 'Atividade', icon: 'ListTodo' },
};
