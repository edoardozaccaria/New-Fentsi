import 'server-only';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// Max events per billing period by tier. Unknown tiers default to free limits.
const TIER_LIMITS: Record<string, number> = {
  free: 1,
  single: 1,
  pro: 30,
  planner: 30,
  agency: 200,
  venue: 200,
};

export type UserPlanStatus = {
  tier: string;
  eventsCount: number;
  canCreateEvent: boolean;
};

export async function getUserPlanStatus(userId: string): Promise<UserPlanStatus> {
  const db = createSupabaseServiceClient();

  const [profileResult, countResult] = await Promise.all([
    db.from('profiles').select('subscription_tier').eq('id', userId).single(),
    db.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to fetch profile: ${profileResult.error.message}`);
  }
  if (countResult.error) {
    throw new Error(`Failed to fetch events count: ${countResult.error.message}`);
  }

  const tier = profileResult.data?.subscription_tier ?? 'free';
  const eventsCount = countResult.count ?? 0;
  const limit = TIER_LIMITS[tier] ?? 1;

  return {
    tier,
    eventsCount,
    canCreateEvent: eventsCount < limit,
  };
}
