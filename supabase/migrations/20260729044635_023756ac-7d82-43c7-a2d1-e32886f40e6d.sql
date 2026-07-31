
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Reset categories to standardized pageant scoring categories
DELETE FROM public.categories;
INSERT INTO public.categories (name, sort_order) VALUES
  ('Traje Típico Regional', 1),
  ('Traje de Gala', 2),
  ('Traje de Baño', 3),
  ('Oratoria y Entrevista', 4),
  ('Presencia Escénica', 5),
  ('Simpatía y Carisma', 6);
