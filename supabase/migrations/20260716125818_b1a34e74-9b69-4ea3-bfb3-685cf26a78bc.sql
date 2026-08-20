
CREATE TABLE public.visitors (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  city TEXT,
  region TEXT,
  user_agent TEXT,
  path TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX visitors_created_at_idx ON public.visitors(created_at DESC);
CREATE INDEX visitors_ip_idx ON public.visitors(ip);

GRANT SELECT, INSERT ON public.visitors TO anon;
GRANT SELECT, INSERT ON public.visitors TO authenticated;
GRANT ALL ON public.visitors TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.visitors_id_seq TO anon, authenticated;

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert visit" ON public.visitors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can read visits" ON public.visitors FOR SELECT TO anon, authenticated USING (true);
