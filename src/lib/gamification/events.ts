import type { GamificationAction } from '@/types/gamification.types';

export const FP_AWARDS: Record<GamificationAction, number> = {
  STEP_COMPLETED: 10,
  WIZARD_COMPLETED: 100,
  DOMAIN_UNLOCKED: 25,
  SECTION_COMPLETED: 50,
  VENDOR_CONFIRMED: 150,
  RSVP_ACCEPTED: 5,
  COLLABORATOR_SECTION_COMPLETED: 50,
  STREAK_MAINTAINED: 75,
  HEALTH_SCORE_THRESHOLD: 200,
};
