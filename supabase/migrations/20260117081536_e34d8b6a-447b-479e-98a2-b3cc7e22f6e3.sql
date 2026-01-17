-- Add Omie sync columns to projetos table
ALTER TABLE public.projetos 
ADD COLUMN IF NOT EXISTS omie_codint text,
ADD COLUMN IF NOT EXISTS omie_codigo bigint,
ADD COLUMN IF NOT EXISTS omie_sync_status text DEFAULT 'NOT_SENT',
ADD COLUMN IF NOT EXISTS omie_last_sync_at timestamptz,
ADD COLUMN IF NOT EXISTS omie_last_error text;