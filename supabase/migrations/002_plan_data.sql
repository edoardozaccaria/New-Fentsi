-- ============================================================
-- 002_plan_data.sql
-- Fentsi — add wizard v2 fields and plan_data to events
--
-- Run via:  supabase db push
-- Or paste into the Supabase SQL Editor.
-- ============================================================

alter table public.events
  add column if not exists output_language       text,
  add column if not exists special_requirements  text[] not null default '{}',
  add column if not exists duration              text,
  add column if not exists plan_data             jsonb;
