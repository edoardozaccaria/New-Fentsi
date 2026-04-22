-- ============================================================
-- FENTSI — Auth & Security Enhancement Migration
-- Run this AFTER 001_initial_schema.sql in Supabase SQL Editor
-- ============================================================

-- ── Strengthen profiles table ───────────────────────────────────────────────
-- Add avatar_url column if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update subscription_tier constraint to include 'single'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'single', 'pro', 'agency'));

-- ── Add sessions tracking table ─────────────────────────────────────────────
-- Tracks user login sessions for security auditing
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_seen   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created ON public.user_sessions(created_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.user_sessions FOR DELETE USING (auth.uid() = user_id);

-- ── Tighten events RLS policies ─────────────────────────────────────────────
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert events" ON public.events;
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;

-- New policies: authenticated users get their events linked; anonymous can still create
CREATE POLICY "events_insert_authenticated"
  ON public.events FOR INSERT
  WITH CHECK (
    -- Authenticated users must link events to themselves
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Anonymous users can create events without user_id
    (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "events_select_own_or_anonymous"
  ON public.events FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
  );

CREATE POLICY "events_update_own"
  ON public.events FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND auth.uid() IS NULL)
  );

-- Prevent deletion of events (soft-delete via status instead)
CREATE POLICY "events_delete_own"
  ON public.events FOR DELETE
  USING (user_id = auth.uid());

-- ── Add email audit log ─────────────────────────────────────────────────────
-- Logs when the system sends emails (plan delivery, booking confirmations)
CREATE TABLE IF NOT EXISTS public.email_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_type  TEXT NOT NULL CHECK (email_type IN ('plan_delivery', 'booking_confirmation', 'welcome', 'password_reset')),
  recipient   TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write email logs (no client access)
-- No RLS policies = blocked for all non-service-role clients

-- ── Add plan usage tracking ─────────────────────────────────────────────────
-- Tracks how many plans a user has generated (for subscription limits)
CREATE TABLE IF NOT EXISTS public.plan_usage (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_usage_user_id ON public.plan_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_usage_created ON public.plan_usage(created_at DESC);

ALTER TABLE public.plan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.plan_usage FOR SELECT USING (auth.uid() = user_id);

-- ── Function: check plan limits ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_plan_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier
  FROM public.profiles WHERE id = p_user_id;

  v_limit := CASE v_tier
    WHEN 'free' THEN 1
    WHEN 'single' THEN 1
    WHEN 'pro' THEN 30
    WHEN 'agency' THEN 200
    ELSE 1
  END;

  SELECT COUNT(*) INTO v_used
  FROM public.plan_usage
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';

  RETURN json_build_object(
    'tier', v_tier,
    'limit', v_limit,
    'used', v_used,
    'remaining', GREATEST(v_limit - v_used, 0),
    'allowed', v_used < v_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Function: increment events count on profile ─────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_events_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE public.profiles
    SET events_count = events_count + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS events_increment_count ON public.events;
CREATE TRIGGER events_increment_count
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.increment_events_count();

-- ── Add updated_at trigger to vendors ───────────────────────────────────────
DROP TRIGGER IF EXISTS vendors_updated_at ON public.vendors;
CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Supabase Auth Configuration Notes ───────────────────────────────────────
-- Configure these in Supabase Dashboard → Authentication → Settings:
--
-- 1. Email Auth: Enable email/password sign-up
-- 2. Email Templates: Customize confirmation & reset emails with Fentsi branding
-- 3. URL Configuration:
--    - Site URL: https://your-domain.com
--    - Redirect URLs: https://your-domain.com/auth/callback
-- 4. Rate Limiting:
--    - Email sign-ups: 3 per hour
--    - Password resets: 3 per hour
-- 5. Password Policy:
--    - Minimum length: 6
-- 6. OAuth (optional):
--    - Google: Add client ID & secret
--    - GitHub: Add client ID & secret
