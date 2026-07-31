
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-asignar admin al primer usuario registrado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Candidatas
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  number int,
  locality text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.candidates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates public read" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "candidates admin write" ON public.candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Categorías
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (name, sort_order) VALUES
  ('Simpatía', 1),
  ('Elegancia', 2),
  ('Oratoria', 3),
  ('Presencia escénica', 4);

-- Jurados (los códigos son sensibles → solo admin lee)
CREATE TABLE public.jurors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  access_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.jurors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurors TO authenticated;
ALTER TABLE public.jurors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jurors admin all" ON public.jurors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Votos
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juror_id uuid NOT NULL REFERENCES public.jurors(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score BETWEEN 1 AND 10),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (juror_id, candidate_id, category_id)
);
GRANT ALL ON public.votes TO service_role;
GRANT SELECT ON public.votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.votes TO authenticated;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
-- Lectura pública (para el ranking en vivo). No incluye datos sensibles.
CREATE POLICY "votes public read" ON public.votes FOR SELECT USING (true);
CREATE POLICY "votes admin all" ON public.votes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Los INSERT/UPDATE de jurados van por función servidor con service_role tras validar código.

-- Realtime para ranking en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;

-- Vista de ranking
CREATE OR REPLACE VIEW public.candidate_rankings AS
SELECT
  c.id AS candidate_id,
  c.name,
  c.number,
  c.locality,
  c.photo_url,
  COALESCE(SUM(v.score), 0)::int AS total_score,
  COALESCE(ROUND(AVG(v.score)::numeric, 2), 0)::numeric AS average_score,
  COUNT(v.id)::int AS votes_count
FROM public.candidates c
LEFT JOIN public.votes v ON v.candidate_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.candidate_rankings TO anon, authenticated;
