
-- First add new enum values
ALTER TYPE apontamento_origem ADD VALUE IF NOT EXISTS 'SISTEMA';
ALTER TYPE apontamento_status ADD VALUE IF NOT EXISTS 'NAO_LANCADO';
ALTER TYPE integracao_status ADD VALUE IF NOT EXISTS 'PENDENTE';
