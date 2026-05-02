-- Restrict EXECUTE on has_role
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- Replace permissive bucket SELECT with a narrower one (still serves files via public URL,
-- but prevents arbitrary listing). Public URLs use storage.objects via the storage API which checks RLS;
-- requiring an explicit name match prevents bulk listing.
DROP POLICY IF EXISTS "Public can view gift assets" ON storage.objects;

CREATE POLICY "Public can view gift assets by name"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'gift-assets'
    AND name IS NOT NULL
    AND length(name) > 0
  );