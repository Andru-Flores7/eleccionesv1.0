-- Agrega el campo contest a candidates y ajusta la vista de rankings
-- Fecha: 2026-08-05

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS contest text NOT NULL DEFAULT 'reina';

CREATE OR REPLACE VIEW public.candidate_rankings AS
SELECT
  c.id AS candidate_id,
  c.name,
  c.number,
  c.locality,
  c.photo_url,
  c.contest,
  COALESCE(SUM(v.score), 0)::int AS total_score,
  COALESCE(ROUND(AVG(v.score)::numeric, 2), 0)::numeric AS average_score,
  COUNT(v.id)::int AS votes_count
FROM public.candidates c
LEFT JOIN public.votes v ON v.candidate_id = c.id
GROUP BY c.id, c.contest;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.candidates WHERE name = 'Chico 10' AND contest = 'chico10'
  ) THEN
    INSERT INTO public.candidates (name, number, contest)
    VALUES ('Chico 10', 10, 'chico10');
  END IF;
END;
$$;
