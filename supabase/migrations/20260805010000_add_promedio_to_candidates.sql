-- Agrega el campo promedio a candidates
-- Fecha: 2026-08-05

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS promedio numeric(5,2);
