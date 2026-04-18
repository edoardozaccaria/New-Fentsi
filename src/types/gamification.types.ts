export type GamificationAction =
  | 'STEP_COMPLETED'
  | 'WIZARD_COMPLETED'
  | 'DOMAIN_UNLOCKED'
  | 'SECTION_COMPLETED'
  | 'VENDOR_CONFIRMED'
  | 'RSVP_ACCEPTED'
  | 'COLLABORATOR_SECTION_COMPLETED'
  | 'STREAK_MAINTAINED'
  | 'HEALTH_SCORE_THRESHOLD';

export interface GamificationEvent {
  action: GamificationAction;
  userId: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
}

export interface AwardContext {
  careerFpBefore: number;
  badgesEarned: string[];
  eventMeta?: {
    budgetEur?: number;
    confirmedVendorCount?: number;
    guestCount?: number;
    isOutdoor?: boolean;
    wizardDurationMs?: number;
  };
}

export interface AwardResult {
  points: number;
  badgeSlugs: string[];
  newLevel?: number;
}

export interface BadgeDefinition {
  slug: string;
  name: string;
  category: 'milestone' | 'style' | 'pro';
  isEligible: (event: GamificationEvent, context: AwardContext) => boolean;
}

export interface Profile {
  id: string;
  role: 'consumer' | 'pro';
  plannerLevel: number;
  careerFp: number;
  streakDays: number;
  lastActiveDate: string | null;
}
