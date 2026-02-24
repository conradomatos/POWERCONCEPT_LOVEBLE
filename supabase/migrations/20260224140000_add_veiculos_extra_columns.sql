-- Migration: Adiciona campos extras na tabela veiculos
-- Campos: marca, renavam, cor, valor_fipe

ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS renavam VARCHAR(20);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS cor VARCHAR(30);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS valor_fipe DECIMAL(12,2);
