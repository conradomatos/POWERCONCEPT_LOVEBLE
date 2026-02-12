export interface LancamentoBanco {
  data: Date;
  descricao: string;
  valor: number;
  saldo: number;
  tipo: 'credito' | 'debito';
  cnpj_cpf: string;
  nome_pagador: string;
  classificacao: string;
  matched: boolean;
  match_id?: string;
}

export interface LancamentoOmie {
  data: Date;
  data_vencimento: Date;
  descricao: string;
  valor: number;
  cliente_fornecedor: string;
  cnpj_cpf: string;
  razao_social: string;
  categoria: string;
  conta_corrente: string;
  numero_documento: string;
  natureza: 'receber' | 'pagar';
  situacao: string;
  matched: boolean;
  match_id?: string;
}

export interface TransacaoCartao {
  data: Date;
  descricao: string;
  valor: number;
  parcela: string;
  categoria_sugerida: string;
  matched: boolean;
  match_id?: string;
  omie_match?: {
    cliente_fornecedor: string;
    cnpj_cpf: string;
    numero_documento: string;
  };
}

export interface CartaoInfo {
  banco: string;
  bandeira: string;
  numero_cartao: string;
  titular: string;
  vencimento_fatura: Date | null;
  valor_fatura: number;
  mes_referencia: string;
}

export type TipoDivergencia = 'A' | 'B' | 'B*' | 'C' | 'D' | 'E' | 'H' | 'I';

export interface Divergencia {
  tipo: TipoDivergencia;
  descricao_tipo: string;
  origem: 'banco' | 'omie' | 'cartao';
  data: Date | null;
  descricao: string;
  valor: number;
  nome: string;
  cnpj_cpf: string;
  documento: string;
  categoria: string;
  situacao: string;
  acao_sugerida: string;
  detalhe: string;
}

export type TipoMatch = 'A' | 'B' | 'C' | 'D';

export interface Match {
  tipo: TipoMatch;
  banco: LancamentoBanco;
  omie: LancamentoOmie;
  confianca: string;
  detalhe: string;
}

export interface ResultadoConciliacao {
  matches: Match[];
  divergencias: Divergencia[];
  resumo: {
    total_banco: number;
    total_omie: number;
    total_cartao: number;
    conciliados: number;
    pct_conciliados: number;
    divergencias_count: number;
    contas_atraso: number;
    cartao_importaveis: number;
  };
  mes_referencia: string;
  ano_referencia: number;
}

export interface CategoriaMap {
  [keyword: string]: string;
}
