CREATE TABLE IF NOT EXISTS public.famiglie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listini (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  famiglia_id uuid NOT NULL REFERENCES public.famiglie(id) ON DELETE CASCADE,
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  options_json jsonb NOT NULL DEFAULT '{"opzioni":[],"larghezza_min":60,"larghezza_max":350,"altezza_min":60,"altezza_max":280}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.famiglie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listini ENABLE ROW LEVEL SECURITY;

CREATE POLICY "famiglie: public read" ON public.famiglie FOR SELECT USING (true);
CREATE POLICY "famiglie: admin write" ON public.famiglie FOR ALL USING (public.is_admin());
CREATE POLICY "listini: public read" ON public.listini FOR SELECT USING (true);
CREATE POLICY "listini: admin write" ON public.listini FOR ALL USING (public.is_admin());

INSERT INTO public.famiglie (nome, slug) VALUES ('Porte Finestre', 'porte-finestre') ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.listini (famiglia_id, nome, slug, options_json)
SELECT f.id, t.display_name, t.slug, t.options_json
FROM public.templates t
JOIN public.famiglie f ON f.slug = 'porte-finestre'
ON CONFLICT (slug) DO NOTHING;