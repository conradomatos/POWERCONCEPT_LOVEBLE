-- Set default token for existing records without one
UPDATE ai_settings
SET api_key = 'pc-ia-2026-SkR8mX4vQzL7nW3j'
WHERE api_key IS NULL;

-- Set column default for new records
ALTER TABLE ai_settings
ALTER COLUMN api_key SET DEFAULT 'pc-ia-2026-SkR8mX4vQzL7nW3j';