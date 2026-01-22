-- =============================================
-- ENUMS para o módulo de Rentabilidade
-- =============================================

-- Status de títulos financeiros
CREATE TYPE public.titulo_status AS ENUM ('ABERTO', 'PAGO', 'ATRASADO', 'CANCELADO', 'PARCIAL');

-- Tipo de pendência
CREATE TYPE public.pendencia_tipo AS ENUM ('SEM_PROJETO', 'PROJETO_INEXISTENTE', 'SEM_CATEGORIA', 'APONTAMENTO_SEM_CUSTO', 'OUTRO');

-- Origem da pendência
CREATE TYPE public.pendencia_origem AS ENUM ('OMIE_AR', 'OMIE_AP', 'HORAS');

-- Status da pendência
CREATE TYPE public.pendencia_status AS ENUM ('ABERTA', 'RESOLVIDA', 'IGNORADA');

-- Tipo de sincronização
CREATE TYPE public.sync_tipo AS ENUM ('CONTAS_RECEBER', 'CONTAS_PAGAR', 'PROJETOS');

-- Status de sincronização
CREATE TYPE public.sync_status AS ENUM ('INICIADO', 'SUCESSO', 'ERRO', 'PARCIAL');

-- =============================================
-- TABELA: omie_contas_receber (AR)
-- =============================================
CREATE TABLE public.omie_contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_omie_titulo BIGINT NOT NULL UNIQUE,
  omie_projeto_codigo BIGINT,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  data_emissao DATE NOT NULL,
  vencimento DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_recebido NUMERIC NOT NULL DEFAULT 0,
  status public.titulo_status NOT NULL DEFAULT 'ABERTO',
  cliente TEXT,
  cliente_cnpj TEXT,
  categoria TEXT,
  numero_documento TEXT,
  descricao TEXT,
  data_recebimento DATE,
  parcela TEXT,
  observacoes TEXT,
  sync_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_omie_ar_projeto_id ON public.omie_contas_receber(projeto_id);
CREATE INDEX idx_omie_ar_omie_projeto_codigo ON public.omie_contas_receber(omie_projeto_codigo);
CREATE INDEX idx_omie_ar_vencimento ON public.omie_contas_receber(vencimento);
CREATE INDEX idx_omie_ar_status ON public.omie_contas_receber(status);
CREATE INDEX idx_omie_ar_data_emissao ON public.omie_contas_receber(data_emissao);

-- Trigger para updated_at
CREATE TRIGGER update_omie_ar_updated_at
  BEFORE UPDATE ON public.omie_contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.omie_contas_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with roles can view omie_contas_receber"
  ON public.omie_contas_receber FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admin and Financeiro can insert omie_contas_receber"
  ON public.omie_contas_receber FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin and Financeiro can update omie_contas_receber"
  ON public.omie_contas_receber FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin can delete omie_contas_receber"
  ON public.omie_contas_receber FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TABELA: omie_contas_pagar (AP)
-- =============================================
CREATE TABLE public.omie_contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_omie_titulo BIGINT NOT NULL UNIQUE,
  omie_projeto_codigo BIGINT,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  data_emissao DATE NOT NULL,
  vencimento DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  status public.titulo_status NOT NULL DEFAULT 'ABERTO',
  fornecedor TEXT,
  fornecedor_cnpj TEXT,
  categoria TEXT,
  numero_documento TEXT,
  descricao TEXT,
  data_pagamento DATE,
  parcela TEXT,
  observacoes TEXT,
  sync_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_omie_ap_projeto_id ON public.omie_contas_pagar(projeto_id);
CREATE INDEX idx_omie_ap_omie_projeto_codigo ON public.omie_contas_pagar(omie_projeto_codigo);
CREATE INDEX idx_omie_ap_vencimento ON public.omie_contas_pagar(vencimento);
CREATE INDEX idx_omie_ap_status ON public.omie_contas_pagar(status);
CREATE INDEX idx_omie_ap_data_emissao ON public.omie_contas_pagar(data_emissao);

-- Trigger para updated_at
CREATE TRIGGER update_omie_ap_updated_at
  BEFORE UPDATE ON public.omie_contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.omie_contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with roles can view omie_contas_pagar"
  ON public.omie_contas_pagar FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admin and Financeiro can insert omie_contas_pagar"
  ON public.omie_contas_pagar FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin and Financeiro can update omie_contas_pagar"
  ON public.omie_contas_pagar FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin can delete omie_contas_pagar"
  ON public.omie_contas_pagar FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TABELA: pendencias_financeiras
-- =============================================
CREATE TABLE public.pendencias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.pendencia_tipo NOT NULL,
  origem public.pendencia_origem NOT NULL,
  referencia_id UUID NOT NULL,
  referencia_omie_codigo BIGINT,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  status public.pendencia_status NOT NULL DEFAULT 'ABERTA',
  resolvido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_pendencias_status ON public.pendencias_financeiras(status);
CREATE INDEX idx_pendencias_tipo ON public.pendencias_financeiras(tipo);
CREATE INDEX idx_pendencias_origem ON public.pendencias_financeiras(origem);
CREATE INDEX idx_pendencias_projeto_id ON public.pendencias_financeiras(projeto_id);
CREATE INDEX idx_pendencias_referencia_id ON public.pendencias_financeiras(referencia_id);

-- RLS
ALTER TABLE public.pendencias_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with roles can view pendencias_financeiras"
  ON public.pendencias_financeiras FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admin and Financeiro can insert pendencias_financeiras"
  ON public.pendencias_financeiras FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin and Financeiro can update pendencias_financeiras"
  ON public.pendencias_financeiras FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin can delete pendencias_financeiras"
  ON public.pendencias_financeiras FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TABELA: omie_sync_log
-- =============================================
CREATE TABLE public.omie_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.sync_tipo NOT NULL,
  status public.sync_status NOT NULL DEFAULT 'INICIADO',
  registros_processados INTEGER NOT NULL DEFAULT 0,
  registros_novos INTEGER NOT NULL DEFAULT 0,
  registros_atualizados INTEGER NOT NULL DEFAULT 0,
  pendencias_criadas INTEGER NOT NULL DEFAULT 0,
  erro_mensagem TEXT,
  detalhes JSONB DEFAULT '{}'::jsonb,
  iniciado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMP WITH TIME ZONE,
  iniciado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_sync_log_tipo ON public.omie_sync_log(tipo);
CREATE INDEX idx_sync_log_status ON public.omie_sync_log(status);
CREATE INDEX idx_sync_log_iniciado_em ON public.omie_sync_log(iniciado_em DESC);

-- RLS
ALTER TABLE public.omie_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with roles can view omie_sync_log"
  ON public.omie_sync_log FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admin and Financeiro can insert omie_sync_log"
  ON public.omie_sync_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin and Financeiro can update omie_sync_log"
  ON public.omie_sync_log FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));