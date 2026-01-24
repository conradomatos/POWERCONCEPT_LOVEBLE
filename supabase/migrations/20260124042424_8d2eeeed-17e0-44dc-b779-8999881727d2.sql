-- 1. Add unique case-insensitive index on codigo
CREATE UNIQUE INDEX IF NOT EXISTS equipment_catalog_codigo_lower_unique 
ON equipment_catalog (lower(codigo));

-- 2. Add CHECK constraint for unidade (allowed values only)
ALTER TABLE equipment_catalog 
ADD CONSTRAINT equipment_catalog_unidade_check 
CHECK (unidade IN ('hora', 'dia', 'mês', 'ano'));

-- 3. Add CHECK constraint for codigo format validation
-- 3-20 chars, A-Z, 0-9, hyphen only, no start/end hyphen, no double hyphen
ALTER TABLE equipment_catalog
ADD CONSTRAINT equipment_catalog_codigo_format_check
CHECK (
  length(codigo) >= 3 AND 
  length(codigo) <= 20 AND
  codigo ~ '^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$' AND
  codigo !~ '--'
);

-- 4. Add CHECK constraint for descricao length (10-160 chars)
ALTER TABLE equipment_catalog
ADD CONSTRAINT equipment_catalog_descricao_length_check
CHECK (length(descricao) >= 10 AND length(descricao) <= 160);