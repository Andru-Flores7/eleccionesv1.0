-- Agrega campo de descripción para las candidatas
ALTER TABLE public.candidates
  ADD COLUMN description text;

-- Actualiza la vista de ranking para incluir descripción si se necesita más adelante
DROP VIEW IF EXISTS public.candidate_rankings;

CREATE VIEW public.candidate_rankings AS
SELECT
  c.id AS candidate_id,
  c.name,
  c.number,
  c.locality,
  c.photo_url,
  c.description,
  COALESCE(SUM(v.score), 0)::int AS total_score,
  COALESCE(ROUND(AVG(v.score)::numeric, 2), 0)::numeric AS average_score,
  COUNT(v.id)::int AS votes_count
FROM public.candidates c
LEFT JOIN public.votes v ON v.candidate_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.candidate_rankings TO anon, authenticated;
