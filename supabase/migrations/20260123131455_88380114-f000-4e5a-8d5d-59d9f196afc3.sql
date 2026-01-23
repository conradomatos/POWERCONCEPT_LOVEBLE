-- Tabela para cache de projetos do Omie
CREATE TABLE public.omie_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo BIGINT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cod_int TEXT,
  inativo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.omie_projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem visualizar omie_projetos"
  ON public.omie_projetos FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admin e Financeiro podem inserir omie_projetos"
  ON public.omie_projetos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin e Financeiro podem atualizar omie_projetos"
  ON public.omie_projetos FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admin pode deletar omie_projetos"
  ON public.omie_projetos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Índice para buscas por código
CREATE INDEX idx_omie_projetos_codigo ON public.omie_projetos(codigo);