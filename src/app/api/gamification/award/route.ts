import { z } from 'zod';
import { computeAward } from '@/lib/gamification/engine';
import { computeLevel } from '@/lib/gamification/levels';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import type {
  GamificationEvent,
  AwardContext,
} from '@/types/gamification.types';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  action: z.enum([
    'STEP_COMPLETED',
    'WIZARD_COMPLETED',
    'DOMAIN_UNLOCKED',
    'SECTION_COMPLETED',
    'VENDOR_CONFIRMED',
    'RSVP_ACCEPTED',
    'COLLABORATOR_SECTION_COMPLETED',
    'STREAK_MAINTAINED',
    'HEALTH_SCORE_THRESHOLD',
  ]),
  eventId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  careerFpBefore: z.number().int().min(0),
  badgesEarned: z.array(z.string()),
  eventMeta: z
    .object({
      budgetEur: z.number().optional(),
      confirmedVendorCount: z.number().int().optional(),
      guestCount: z.number().int().optional(),
      isOutdoor: z.boolean().optional(),
      wizardDurationMs: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { action, eventId, metadata, careerFpBefore, badgesEarned, eventMeta } =
    parsed.data;

  const gamificationEvent: GamificationEvent = {
    action,
    userId: user.id,
    eventId,
    metadata,
  };
  const awardContext: AwardContext = {
    careerFpBefore,
    badgesEarned,
    eventMeta,
  };
  const award = computeAward(gamificationEvent, awardContext);

  if (award.points === 0) {
    return Response.json({ award });
  }

  const admin = createSupabaseServiceClient();

  await admin.from('fp_transactions').insert({
    user_id: user.id,
    event_id: eventId ?? null,
    action,
    points: award.points,
  });

  const newCareerFp = careerFpBefore + award.points;
  await admin.from('profiles').upsert({
    id: user.id,
    career_fp: newCareerFp,
    planner_level: award.newLevel ?? computeLevel(careerFpBefore),
    last_active_date: new Date().toISOString().split('T')[0],
  });

  if (eventId) {
    await admin.rpc('increment_event_fp', {
      p_event_id: eventId,
      p_points: award.points,
    });
  }

  if (award.badgeSlugs.length > 0) {
    const { data: badgeRows } = await admin
      .from('badges')
      .select('id, slug')
      .in('slug', award.badgeSlugs);

    if (badgeRows && badgeRows.length > 0) {
      await admin.from('user_badges').insert(
        badgeRows.map((b: { id: string; slug: string }) => ({
          user_id: user.id,
          badge_id: b.id,
          event_id: eventId ?? null,
        }))
      );
    }
  }

  return Response.json({ award });
}
