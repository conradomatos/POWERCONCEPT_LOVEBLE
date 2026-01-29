-- Adicionar coluna is_active na tabela profiles para controle de status do usuário
ALTER TABLE public.profiles
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.profiles.is_active IS 'Indica se o usuário está ativo no sistema';