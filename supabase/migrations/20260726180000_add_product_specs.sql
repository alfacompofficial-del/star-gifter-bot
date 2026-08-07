-- Add specs JSONB column to products table for storing key-value characteristics
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]'::jsonb;

-- Comment
COMMENT ON COLUMN public.products.specs IS 'Array of {key, value} objects for product characteristics';
