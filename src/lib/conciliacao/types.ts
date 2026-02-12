export interface LancamentoBanco {
  idx: number;
  data: Date;
  dataStr: string;
  descricao: string;
  documento: string;
  valor: number;
  saldo: number | null;
  cnpjCpf: string;
  nome: string;
  tipo: string;
  matched: boolean;
  matchType: string | null;
  matchCamada: string | null;
  matchOmieIdx: number | null;
}

export interface LancamentoOmie {
  idx: number;
  situacao: string;
  data: Date;
  dataStr: string;
  clienteFornecedor: string;
  contaCorrente: string;
  categoria: string;
  valor: number;
  tipoDoc: string;
  documento: string;
  notaFiscal: string;
  parcela: string;
  origem: string;
  projeto: string;
  razaoSocial: string;
  cnpjCpf: string;
  observacoes: string;
  matched: boolean;
  matchType: string | null;
  matchCamada: string | null;
  matchBancoIdx: number | null;
}

export interface TransacaoCartao {
  data: Date;
  dataStr: string;
  descricao: string;
  parcela: string;
  valor: number;
  titular: string;
  cartao: string;
  isPagamentoFatura: boolean;
  isEstorno: boolean;
  matchedNf: boolean;
  matchOmieIdx: number | null;
  matchFornecedorOmie: string;
  matchTipoDoc: string;
  matchNf: string;
  categoriaSugerida: string;
}

export interface CartaoInfo {
  vencimento: string;
  valorTotal: number;
  situacao: string;
  despesasBrasil: number;
  despesasExterior: number;
  pagamentos: number;
}

export interface Match {
  camada: string;
  tipo: string;
  banco: LancamentoBanco;
  omie: LancamentoOmie;
}

export interface Divergencia {
  tipo: string;
  tipoNome: string;
  fonte: string;
  data: string;
  valor: number;
  descricao?: string;
  cnpjCpf?: string;
  nome?: string;
  situacao?: string;
  origem?: string;
  acao?: string;
  valorBanco?: number;
  valorOmie?: number;
  diferenca?: number;
  dataBanco?: string;
  dataOmie?: string;
  diasDiferenca?: number;
  titular?: string;
  fornecedorOmie?: string;
  tipoDoc?: string;
  nf?: string;
  categoriaSugerida?: string;
  parcela?: string;
  banco?: LancamentoBanco | null;
  omie?: LancamentoOmie | null;
}

export interface ResultadoConciliacao {
  matches: Match[];
  divergencias: Divergencia[];
  banco: LancamentoBanco[];
  omieSicredi: LancamentoOmie[];
  omieCartao: LancamentoOmie[];
  cartaoTransacoes: TransacaoCartao[];
  cartaoInfo: CartaoInfo;
  saldoBanco: number | null;
  saldoOmie: number | null;
  camadaCounts: Record<string, number>;
  divCounts: Record<string, number>;
  totalConciliados: number;
  totalDivergencias: number;
  contasAtraso: number;
  cartaoImportaveis: number;
  mesLabel: string;
  anoLabel: string;
}
