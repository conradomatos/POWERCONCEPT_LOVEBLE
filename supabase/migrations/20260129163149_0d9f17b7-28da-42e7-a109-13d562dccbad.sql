-- Adicionar coluna user_id para vínculo com auth.users
ALTER TABLE public.collaborators
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice para buscas rápidas
CREATE INDEX idx_collaborators_user_id ON public.collaborators(user_id);

-- Constraint para garantir vínculo único (1 usuário = 1 colaborador)
ALTER TABLE public.collaborators
ADD CONSTRAINT collaborators_user_id_unique UNIQUE (user_id);

-- Comentário explicativo
COMMENT ON COLUMN public.collaborators.user_id IS 'Vínculo com usuário do sistema para auto-seleção em Apontamento Diário';