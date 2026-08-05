-- Añade o actualiza las categorías usadas por el jurado
-- Fecha: 2026-08-05

INSERT INTO public.categories (name, sort_order)
VALUES
  ('Exposición oral', 1),
  ('Actitud pasarela', 2),
  ('Compromiso escolar', 3),
  ('Compañerismo', 4),
  ('Debate', 5),
  ('Notas', 6)
ON CONFLICT (name) DO UPDATE
  SET sort_order = EXCLUDED.sort_order;
