
-- Create conciliacao_imports table
CREATE TABLE public.conciliacao_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  periodo_ref TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fim DATE,
  status TEXT DEFAULT 'ativo',
  nome_arquivo TEXT,
  total_lancamentos INTEGER DEFAULT 0,
  valor_total NUMERIC(15,2) DEFAULT 0,
  saldo_anterior NUMERIC(15,2),
  dados JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger for tipo
CREATE OR REPLACE FUNCTION public.validate_conciliacao_import_tipo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo NOT IN ('extrato_banco', 'extrato_omie', 'fatura_cartao') THEN
    RAISE EXCEPTION 'Invalid tipo: %. Must be extrato_banco, extrato_omie, or fatura_cartao', NEW.tipo;
  END IF;
  IF NEW.status NOT IN ('ativo', 'substituido') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be ativo or substituido', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_conciliacao_import_tipo_trigger
BEFORE INSERT OR UPDATE ON public.conciliacao_imports
FOR EACH ROW EXECUTE FUNCTION public.validate_conciliacao_import_tipo();

-- Partial unique index: only one 'ativo' per tipo+periodo
CREATE UNIQUE INDEX idx_conciliacao_imports_ativo 
  ON public.conciliacao_imports(tipo, periodo_ref) 
  WHERE status = 'ativo';

-- Index for fast lookup
CREATE INDEX idx_conciliacao_imports_periodo 
  ON public.conciliacao_imports(periodo_ref, status);

-- Auto-update updated_at
CREATE TRIGGER update_conciliacao_imports_updated_at
BEFORE UPDATE ON public.conciliacao_imports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.conciliacao_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage conciliacao_imports"
  ON public.conciliacao_imports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
