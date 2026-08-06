-- Actualiza el valor por defecto y los registros existentes de contest
-- Fecha: 2026-08-06

ALTER TABLE public.candidates
  ALTER COLUMN contest SET DEFAULT 'Embajadora';

UPDATE public.candidates
  SET contest = 'Embajadora'
  WHERE contest = 'reina';
