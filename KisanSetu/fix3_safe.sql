-- ============================================================
-- FIX 3 (SAFE TO RE-RUN) — Storage Buckets + Policies
-- Buckets use ON CONFLICT DO NOTHING (already safe)
-- Policies use DROP IF EXISTS before CREATE (safe to re-run)
-- ============================================================

-- Step 1: Ensure buckets exist (safe, already handles conflicts)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profiles', 'profiles', true),
  ('produce-images', 'produce-images', true),
  ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies before recreating (avoids 42710 error)

-- Profile image policies
DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;

-- Produce image policies
DROP POLICY IF EXISTS "Farmers can upload produce images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view produce images" ON storage.objects;

-- Equipment image policies (added for completeness)
DROP POLICY IF EXISTS "Owners can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view equipment images" ON storage.objects;

-- Step 3: Recreate all policies

-- Profile bucket
CREATE POLICY "Users can upload own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

-- Produce images bucket
CREATE POLICY "Farmers can upload produce images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'produce-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view produce images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'produce-images');

-- Equipment images bucket
CREATE POLICY "Owners can upload equipment images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'equipment-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view equipment images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'equipment-images');
