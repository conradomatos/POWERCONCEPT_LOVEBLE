
CREATE TABLE conciliacao_resultados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_ref TEXT NOT NULL,
  total_conciliados INTEGER DEFAULT 0,
  total_divergencias INTEGER DEFAULT 0,
  total_em_atraso INTEGER DEFAULT 0,
  total_cartao_importaveis INTEGER DEFAULT 0,
  camada_a INTEGER DEFAULT 0,
  camada_b INTEGER DEFAULT 0,
  camada_c INTEGER DEFAULT 0,
  camada_d INTEGER DEFAULT 0,
  resultado JSONB NOT NULL,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_conciliacao_resultados_ativo
  ON conciliacao_resultados(periodo_ref)
  WHERE status = 'ativo';

ALTER TABLE conciliacao_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage conciliacao_resultados"
  ON conciliacao_resultados FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.validate_conciliacao_resultado_status()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('ativo', 'substituido') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be ativo or substituido', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_conciliacao_resultado_status
  BEFORE INSERT OR UPDATE ON conciliacao_resultados
  FOR EACH ROW EXECUTE FUNCTION validate_conciliacao_resultado_status();
