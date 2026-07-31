-- Permitir que el jurado pueda validar su código sin estar autenticado
CREATE POLICY "jurors public select" ON public.jurors
  FOR SELECT
  USING (true);

GRANT SELECT ON public.jurors TO anon, authenticated;
