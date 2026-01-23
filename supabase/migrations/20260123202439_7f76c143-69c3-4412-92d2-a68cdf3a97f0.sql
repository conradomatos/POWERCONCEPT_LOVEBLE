-- Add equipe column to collaborators table
ALTER TABLE public.collaborators ADD COLUMN equipe TEXT;

-- Create index for faster filtering
CREATE INDEX idx_collaborators_equipe ON public.collaborators(equipe);