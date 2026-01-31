-- Create enum for collaborator regions
CREATE TYPE public.regiao_colaborador AS ENUM ('Campos Gerais', 'Paranaguá');

-- Add region column to collaborators table
ALTER TABLE public.collaborators ADD COLUMN regiao public.regiao_colaborador;

-- Add region column to profiles table (for user preferences)
ALTER TABLE public.profiles ADD COLUMN regiao public.regiao_colaborador;

-- Create index for faster filtering by region
CREATE INDEX idx_collaborators_regiao ON public.collaborators(regiao) WHERE regiao IS NOT NULL;