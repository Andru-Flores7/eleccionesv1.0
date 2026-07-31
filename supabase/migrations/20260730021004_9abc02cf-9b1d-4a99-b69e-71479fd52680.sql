DELETE FROM public.votes;
DELETE FROM public.categories;
INSERT INTO public.categories (name, sort_order) VALUES
  ('Desenvoltura', 1),
  ('Simpatía', 2),
  ('Elegancia', 3),
  ('Personalidad', 4);