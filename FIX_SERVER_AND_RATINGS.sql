-- =================================================================
-- AlfaComp: Полный SQL скрипт для исправления админки и рейтинга
-- Скопируйте и выполните в Supabase Dashboard: SQL Editor -> New Query -> Run
-- =================================================================

-- 1. Гарантируем наличие и полную структуру таблицы public.products
CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT DEFAULT 'AlfaComp',
  image TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  old_price NUMERIC,
  category TEXT NOT NULL DEFAULT 'Комплектующие',
  in_stock BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 999,
  specs JSONB DEFAULT '[]'::jsonb,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем недостающие колонки в public.products (если таблица уже была создана ранее)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'AlfaComp';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 999;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Создаем таблицу оценок пользователей (public.product_ratings)
CREATE TABLE IF NOT EXISTS public.product_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_ratings_prod ON public.product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user ON public.product_ratings(user_id);

-- 3. Функция и триггер автоматического пересчета среднего рейтинга товара
CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_id BIGINT;
  avg_score NUMERIC;
  cnt_votes INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_id := OLD.product_id;
  ELSE
    target_id := NEW.product_id;
  END IF;

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0),
    COUNT(*)
  INTO avg_score, cnt_votes
  FROM public.product_ratings
  WHERE product_id = target_id;

  UPDATE public.products
  SET
    rating = CASE WHEN cnt_votes > 0 THEN avg_score ELSE 5.0 END,
    rating_count = cnt_votes,
    updated_at = now()
  WHERE id = target_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_rating ON public.product_ratings;
CREATE TRIGGER trg_sync_product_rating
AFTER INSERT OR UPDATE OR DELETE ON public.product_ratings
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_rating();

-- 4. Включаем RLS и создаем полные политики доступа (SELECT, INSERT, UPDATE, DELETE)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Политики для public.products
DROP POLICY IF EXISTS "Public select products" ON public.products;
CREATE POLICY "Public select products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert products" ON public.products;
CREATE POLICY "Public insert products" ON public.products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update products" ON public.products;
CREATE POLICY "Public update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete products" ON public.products;
CREATE POLICY "Public delete products" ON public.products FOR DELETE USING (true);

-- Политики для public.product_ratings
DROP POLICY IF EXISTS "Public select ratings" ON public.product_ratings;
CREATE POLICY "Public select ratings" ON public.product_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert ratings" ON public.product_ratings;
CREATE POLICY "Public insert ratings" ON public.product_ratings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update ratings" ON public.product_ratings;
CREATE POLICY "Public update ratings" ON public.product_ratings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete ratings" ON public.product_ratings;
CREATE POLICY "Public delete ratings" ON public.product_ratings FOR DELETE USING (true);

-- Политики для public.categories
DROP POLICY IF EXISTS "Public select categories" ON public.categories;
CREATE POLICY "Public select categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage categories" ON public.categories;
CREATE POLICY "Public manage categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Политики для public.visitors
DROP POLICY IF EXISTS "Public insert visitors" ON public.visitors;
CREATE POLICY "Public insert visitors" ON public.visitors FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public select visitors" ON public.visitors;
CREATE POLICY "Public select visitors" ON public.visitors FOR SELECT USING (true);

-- 5. Выдача прав (GRANTS) ролям anon, authenticated и service_role
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_ratings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.visitors TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Гарантируем наличие настройки курса валют в categories
INSERT INTO public.categories (name, sort_order)
VALUES ('SETTINGS_EXCHANGE_RATE', 11858)
ON CONFLICT (name) DO NOTHING;
