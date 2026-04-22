-- ============================================================
-- FENTSI — Vendor Self-Onboarding Migration
-- Run AFTER 002_auth_security.sql in Supabase SQL Editor
-- ============================================================

-- ── 1. Extend profiles.role to include 'vendor' ──────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'planner', 'venue', 'vendor', 'admin'));

-- ── 2. Add vendor self-service columns to vendors ────────────────────────────
-- These are filled by the vendor during self-onboarding (separate from
-- the Google Places enrichment columns like description, price_from, photo_urls)

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS base_price       DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS cover_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_owner ON public.vendors(owner_user_id);

-- ── 3. vendor_categories table ───────────────────────────────────────────────
-- Stores the service categories a vendor offers (multi-value, from wizard Step 2)

CREATE TABLE IF NOT EXISTS public.vendor_categories (
  vendor_id   UUID  REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  category    TEXT  NOT NULL,
  PRIMARY KEY (vendor_id, category)
);

CREATE INDEX IF NOT EXISTS idx_vendor_categories_vendor ON public.vendor_categories(vendor_id);

ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vendor categories"
  ON public.vendor_categories FOR SELECT USING (true);

CREATE POLICY "Vendors can insert own categories"
  ON public.vendor_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = vendor_id
        AND v.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own categories"
  ON public.vendor_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = vendor_id
        AND v.owner_user_id = auth.uid()
    )
  );

-- ── 4. Extend vendors RLS for self-service inserts/updates ───────────────────
-- (the existing "Anyone can read vendors" SELECT policy stays untouched)

CREATE POLICY "Authenticated users can self-register as vendor"
  ON public.vendors FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_user_id = auth.uid()
  );

CREATE POLICY "Vendors can update own profile"
  ON public.vendors FOR UPDATE
  USING (owner_user_id = auth.uid());

-- ── 5. Storage: vendor_portfolios bucket ─────────────────────────────────────
-- Creates the public bucket used for vendor cover images and portfolio photos.
-- Files are stored at: vendor_portfolios/{user_id}/{filename}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor_portfolios',
  'vendor_portfolios',
  true,
  10485760,   -- 10 MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── 6. Storage RLS policies ───────────────────────────────────────────────────
-- Public read (so cover images render for all visitors)
CREATE POLICY "Public can read vendor portfolio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vendor_portfolios');

-- Only the authenticated owner of a folder can upload into it.
-- Folder structure: vendor_portfolios/{auth.uid()}/...
CREATE POLICY "Vendors can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vendor_portfolios'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Vendors can update files in own folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vendor_portfolios'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Vendors can delete files in own folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vendor_portfolios'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
