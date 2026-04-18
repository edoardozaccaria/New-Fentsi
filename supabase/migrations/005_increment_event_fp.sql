-- ============================================================
-- 005_increment_event_fp.sql
-- Atomic increment for event_fp to avoid race conditions
-- ============================================================
create or replace function public.increment_event_fp(
  p_event_id uuid,
  p_points   int
) returns void
language sql security definer as $$
  update public.events
  set event_fp = event_fp + p_points
  where id = p_event_id;
$$;
