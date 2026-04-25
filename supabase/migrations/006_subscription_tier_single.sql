-- Add 'single' to the allowed subscription_tier values.
-- The existing CHECK constraint must be dropped and recreated.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'single', 'pro', 'planner', 'agency', 'venue'));
