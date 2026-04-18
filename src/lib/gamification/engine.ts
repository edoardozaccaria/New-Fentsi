import { FP_AWARDS } from './events';
import { computeLevel } from './levels';
import { checkBadgeEligibility } from './badges';
import type {
  GamificationEvent,
  AwardContext,
  AwardResult,
} from '@/types/gamification.types';

/**
 * Pure function: computes FP, badge slugs, and level change for a gamification event.
 * Has no side effects — persistence is the caller's responsibility.
 */
export function computeAward(
  event: GamificationEvent,
  context: AwardContext
): AwardResult {
  const points = FP_AWARDS[event.action];
  const careerFpAfter = context.careerFpBefore + points;

  const badgeSlugs = checkBadgeEligibility(event, context);

  const levelBefore = computeLevel(context.careerFpBefore);
  const levelAfter = computeLevel(careerFpAfter);

  return {
    points,
    badgeSlugs,
    newLevel: levelAfter !== levelBefore ? levelAfter : undefined,
  };
}
