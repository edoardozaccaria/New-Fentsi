-- ============================================================
-- New-Fentsi schema migration
-- Renames the legacy JSONB events table and creates the
-- typed events + event_suppliers tables that generate-suppliers needs.
-- Run ONCE in Supabase SQL Editor.
-- ============================================================

-- ── 1. Archive the old events table ──────────────────────────────────────────
ALTER TABLE public.events RENAME TO events_legacy;

-- ── 2. New typed events table ─────────────────────────────────────────────────
CREATE TABLE public.events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  event_date          DATE,
  duration            TEXT,
  guest_count         INTEGER NOT NULL CHECK (guest_count >= 0),
  city                TEXT NOT NULL,
  venue_preference    TEXT,
  budget_usd          NUMERIC NOT NULL CHECK (budget_usd >= 0),
  style_preferences   TEXT[] NOT NULL DEFAULT '{}',
  required_services   TEXT[] NOT NULL DEFAULT '{}',
  special_requirements TEXT[] NOT NULL DEFAULT '{}',
  special_requests    TEXT,
  output_language     TEXT,
  plan_data           JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_id  ON public.events(user_id);
CREATE INDEX idx_events_created  ON public.events(created_at DESC);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own events"
  ON public.events
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 3. event_suppliers table ──────────────────────────────────────────────────
CREATE TABLE public.event_suppliers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  description         TEXT,
  estimated_price_usd NUMERIC,
  city                TEXT,
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_suppliers_event_id ON public.event_suppliers(event_id);
CREATE INDEX idx_event_suppliers_category ON public.event_suppliers(category);

ALTER TABLE public.event_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own event suppliers"
  ON public.event_suppliers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role inserts event suppliers"
  ON public.event_suppliers FOR INSERT
  WITH CHECK (true);
