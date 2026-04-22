-- ============================================================
-- 003_health_score.sql
-- Fentsi — add health score tracking to events
--
-- Run via:  supabase db push
-- Or paste into the Supabase SQL Editor.
-- ============================================================

alter table public.events
  add column if not exists health_score      numeric default 0,
  add column if not exists completeness_score numeric default 0,
  add column if not exists coherence_score    numeric default 0;

-- Ensure scores are between 0 and 100
alter table public.events
  add constraint health_score_range check (health_score >= 0 and health_score <= 100),
  add constraint completeness_score_range check (completeness_score >= 0 and completeness_score <= 100),
  add constraint coherence_score_range check (coherence_score >= 0 and coherence_score <= 100);
