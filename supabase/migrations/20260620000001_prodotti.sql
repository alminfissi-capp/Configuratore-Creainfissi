-- ════════════════════════════════════════════════════════════════
-- PRODOTTI: ogni listino contiene N prodotti (le "card").
-- Il tipo (griglia | catalogo-prodotti | prodotti-su-misura) vive sul
-- listino; tutta la configurazione di prezzo/immagine/opzioni del singolo
-- prodotto vive in prodotti.config_json (forma discriminata dal tipo del
-- listino padre). Vedi src/types/index.ts.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.prodotti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listino_id uuid NOT NULL REFERENCES public.listini(id) ON DELETE CASCADE,
  nome text NOT NULL,
  slug text NOT NULL,
  image_url text,
  pdf_url text,
  ordinamento int NOT NULL DEFAULT 0,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (listino_id, slug)
);

CREATE INDEX IF NOT EXISTS prodotti_listino_id_idx ON public.prodotti (listino_id);

ALTER TABLE public.prodotti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prodotti: public read" ON public.prodotti FOR SELECT USING (true);
CREATE POLICY "prodotti: admin write" ON public.prodotti FOR ALL USING (public.is_admin());

-- ════════════════════════════════════════════════════════════════
-- STORAGE: bucket per immagini prodotto + PDF listino.
-- Lettura pubblica (immagini servite in chiaro), scrittura solo admin.
-- ════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('listini-assets', 'listini-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "listini-assets: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listini-assets');

CREATE POLICY "listini-assets: admin insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listini-assets' AND public.is_admin());

CREATE POLICY "listini-assets: admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'listini-assets' AND public.is_admin());

CREATE POLICY "listini-assets: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listini-assets' AND public.is_admin());
