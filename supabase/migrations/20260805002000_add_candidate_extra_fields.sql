-- Añade campos adicionales a la tabla candidates para el formulario de candidatas
-- Fecha: 2026-08-05

ALTER TABLE public.candidates
  ADD COLUMN curso text,
  ADD COLUMN age int,
  ADD COLUMN signo text,
  ADD COLUMN hobby text,
  ADD COLUMN color_preferido text,
  ADD COLUMN musica_favorita text,
  ADD COLUMN persona_favorita text,
  ADD COLUMN mejor_amigo text,
  ADD COLUMN libro_preferido text,
  ADD COLUMN meta_vida text,
  ADD COLUMN mensaje_juventud text;
