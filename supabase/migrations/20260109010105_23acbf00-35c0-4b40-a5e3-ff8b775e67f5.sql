-- Create enum for origem
CREATE TYPE public.apontamento_origem AS ENUM ('IMPORTACAO', 'MANUAL');

-- Create enum for tipo_hora
CREATE TYPE public.tipo_hora AS ENUM ('NORMAL', 'H50', 'H100', 'NOTURNA');

-- Create enum for status_apontamento
CREATE TYPE public.apontamento_status AS ENUM ('PENDENTE', 'LANCADO', 'APROVADO', 'REPROVADO');

-- Create enum for status_integracao
CREATE TYPE public.integracao_status AS ENUM ('OK', 'ERRO');

-- Create the consolidated table
CREATE TABLE public.apontamentos_consolidado (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem apontamento_origem NOT NULL,
  arquivo_importacao_id UUID,
  linha_arquivo INTEGER,
  data_importacao TIMESTAMP WITH TIME ZONE,
  usuario_lancamento UUID REFERENCES auth.users(id),
  
  -- Projeto/Tarefa
  projeto_id UUID REFERENCES public.projetos(id),
  projeto_nome TEXT,
  os_numero TEXT,
  tarefa_id UUID,
  tarefa_nome TEXT,
  centro_custo TEXT,
  
  -- Pessoa
  funcionario_id UUID REFERENCES public.collaborators(id),
  cpf TEXT NOT NULL,
  nome_funcionario TEXT,
  
  -- Apontamento
  data_apontamento DATE NOT NULL,
  horas NUMERIC(10,2) NOT NULL DEFAULT 0,
  tipo_hora tipo_hora NOT NULL DEFAULT 'NORMAL',
  descricao TEXT,
  observacao TEXT,
  
  -- Status e processamento
  status_apontamento apontamento_status NOT NULL DEFAULT 'PENDENTE',
  status_integracao integracao_status NOT NULL DEFAULT 'OK',
  motivo_erro TEXT,
  gantt_atualizado BOOLEAN NOT NULL DEFAULT false,
  data_atualizacao_gantt TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_apontamentos_consolidado_projeto ON public.apontamentos_consolidado(projeto_id);
CREATE INDEX idx_apontamentos_consolidado_funcionario ON public.apontamentos_consolidado(funcionario_id);
CREATE INDEX idx_apontamentos_consolidado_data ON public.apontamentos_consolidado(data_apontamento);
CREATE INDEX idx_apontamentos_consolidado_status ON public.apontamentos_consolidado(status_apontamento);
CREATE INDEX idx_apontamentos_consolidado_integracao ON public.apontamentos_consolidado(status_integracao);
CREATE INDEX idx_apontamentos_consolidado_origem ON public.apontamentos_consolidado(origem);

-- Enable RLS
ALTER TABLE public.apontamentos_consolidado ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users with roles can view apontamentos_consolidado"
ON public.apontamentos_consolidado
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert apontamentos_consolidado"
ON public.apontamentos_consolidado
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "RH and Admin can update apontamentos_consolidado"
ON public.apontamentos_consolidado
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin can delete apontamentos_consolidado"
ON public.apontamentos_consolidado
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_apontamentos_consolidado_updated_at
BEFORE UPDATE ON public.apontamentos_consolidado
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for import files tracking
CREATE TABLE public.arquivos_importacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  total_linhas INTEGER NOT NULL DEFAULT 0,
  linhas_sucesso INTEGER NOT NULL DEFAULT 0,
  linhas_erro INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for arquivos_importacao
ALTER TABLE public.arquivos_importacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with roles can view arquivos_importacao"
ON public.arquivos_importacao
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "RH and Admin can insert arquivos_importacao"
ON public.arquivos_importacao
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));