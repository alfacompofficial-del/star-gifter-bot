-- =========================
-- Roles enum + table
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  stars_purchased BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins see all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Inserts only via edge functions (service role)

CREATE INDEX idx_profiles_telegram_id ON public.profiles(telegram_id);

-- =========================
-- Gifts catalog
-- =========================
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_stars INTEGER NOT NULL CHECK (price_stars > 0),
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gifts"
  ON public.gifts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all gifts"
  ON public.gifts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage gifts"
  ON public.gifts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Transactions (sent gifts)
-- sender_id stored for fraud/audit but never exposed via RLS to non-admins
-- =========================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,        -- internal only
  recipient_id UUID NOT NULL,
  gift_id UUID NOT NULL REFERENCES public.gifts(id),
  price_stars INTEGER NOT NULL,
  is_opened BOOLEAN NOT NULL DEFAULT false,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Recipient can see their incoming gifts (RLS column-level handled in views/queries client-side: never select sender_id)
CREATE POLICY "Recipients view their incoming gifts"
  ON public.transactions FOR SELECT
  USING (auth.uid() = recipient_id);

-- Recipient can mark as opened
CREATE POLICY "Recipients can mark as opened"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Admins view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_transactions_recipient ON public.transactions(recipient_id, created_at DESC);
CREATE INDEX idx_transactions_sender ON public.transactions(sender_id);

-- =========================
-- Purchases (Stars top-ups via bot)
-- =========================
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_stars INTEGER NOT NULL CHECK (amount_stars > 0),
  telegram_payment_charge_id TEXT UNIQUE,
  provider_payment_charge_id TEXT,
  invoice_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all purchases"
  ON public.purchases FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- App settings (singleton row id=1)
-- =========================
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY CHECK (id = 1),
  notification_group_id TEXT,
  gift_received_image_url TEXT,
  gift_received_message TEXT DEFAULT 'You received an anonymous gift! 🎁',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (1);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins update settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_gifts_updated BEFORE UPDATE ON public.gifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Storage bucket for gift images & received-gift image
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('gift-assets', 'gift-assets', true);

CREATE POLICY "Public can view gift assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gift-assets');

CREATE POLICY "Admins can upload gift assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gift-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gift assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'gift-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gift assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gift-assets' AND public.has_role(auth.uid(), 'admin'));

-- =========================
-- Realtime for transactions (so recipient sees gifts live)
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;