-- ============================================================
-- FENTSI — Initial Supabase Schema
-- Run this in your Supabase SQL Editor (Project → SQL Editor → New Query)
-- ============================================================

-- ── Events table ─────────────────────────────────────────────────────────────
-- Stores wizard answers + generated AI plan in a single JSONB record
CREATE TABLE IF NOT EXISTS public.events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data        JSONB NOT NULL,                   -- OnboardingData from wizard
  plan        JSONB,                            -- EventPlan from AI
  status      TEXT DEFAULT 'draft'
              CHECK (status IN ('draft', 'planning', 'completed', 'error')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_status  ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.events(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security for events ────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone can create an event (couples without accounts)
CREATE POLICY "Anyone can insert events"
  ON public.events FOR INSERT WITH CHECK (true);

-- Users see their own events; anonymous events are readable by anyone (via eventId)
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ── Profiles table ────────────────────────────────────────────────────────────
-- Extended user profile for SaaS features (created automatically on sign-up)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT,
  full_name           TEXT,
  company             TEXT,
  role                TEXT DEFAULT 'user'
                      CHECK (role IN ('user', 'planner', 'venue', 'admin')),
  stripe_customer_id  TEXT,
  subscription_status TEXT DEFAULT 'free'
                      CHECK (subscription_status IN ('free', 'trialing', 'active', 'canceled', 'past_due')),
  subscription_tier   TEXT DEFAULT 'free'
                      CHECK (subscription_tier IN ('free', 'pro', 'planner', 'agency', 'venue')),
  events_count        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on new user sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Vendors table (partner + enriched Google Places cache) ───────────────────
-- Stores Fentsi's curated vendor database and caches Google Places results
CREATE TABLE IF NOT EXISTS public.vendors (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Identity
  name          TEXT NOT NULL,
  category      TEXT NOT NULL, -- 'venue' | 'catering' | 'photography' | etc.
  description   TEXT,

  -- Location
  city          TEXT,
  region        TEXT,
  country       TEXT DEFAULT 'IT',
  lat           DECIMAL(10, 8),
  lng           DECIMAL(11, 8),
  address       TEXT,

  -- Contact
  website       TEXT,
  phone         TEXT,
  email         TEXT,
  instagram     TEXT,
  google_maps_uri TEXT,

  -- Pricing
  price_range   TEXT CHECK (price_range IN ('€', '€€', '€€€', '€€€€')),
  price_from    DECIMAL(10, 2),
  price_to      DECIMAL(10, 2),

  -- Quality signals
  rating        DECIMAL(3, 2),
  review_count  INTEGER,
  is_partner    BOOLEAN DEFAULT FALSE, -- Fentsi verified partner

  -- Match attributes
  styles        TEXT[],       -- ['rustic', 'elegant', 'modern', 'bohemian']
  event_types   TEXT[],       -- ['wedding', 'corporate', 'birthday']
  min_guests    INTEGER,
  max_guests    INTEGER,

  -- Media
  photo_urls    TEXT[],       -- array of photo URLs

  -- Source
  google_place_id TEXT UNIQUE,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_vendors_category  ON public.vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_city      ON public.vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_location  ON public.vendors USING GIST (point(lng, lat));
CREATE INDEX IF NOT EXISTS idx_vendors_partner   ON public.vendors(is_partner) WHERE is_partner = TRUE;

-- Vendors are public read; only service role can write
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vendors" ON public.vendors FOR SELECT USING (is_active = TRUE);

-- ── Vendor reviews table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.vendor_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can write reviews"
  ON public.vendor_reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── Useful views ──────────────────────────────────────────────────────────────
-- Summary view for admin dashboard
CREATE OR REPLACE VIEW public.events_summary AS
SELECT
  e.id,
  e.status,
  e.created_at,
  e.data->>'eventType'    AS event_type,
  e.data->>'region'       AS region,
  (e.data->>'budget')::int AS budget,
  (e.data->>'guestsCount')::int AS guests,
  e.plan IS NOT NULL       AS has_plan,
  e.user_id IS NOT NULL    AS is_authenticated
FROM public.events e;

-- ── Sample partner vendor (remove or update) ──────────────────────────────────
-- INSERT INTO public.vendors (name, category, city, country, rating, review_count, is_partner, price_range, styles, event_types)
-- VALUES ('Villa Belvedere', 'venue', 'Florence', 'IT', 4.9, 87, TRUE, '€€€', ARRAY['rustic','elegant'], ARRAY['wedding','anniversary']);
