import type {
  BadgeDefinition,
  GamificationEvent,
  AwardContext,
} from '@/types/gamification.types';

const FOUR_MINUTES_MS = 4 * 60 * 1000;

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    slug: 'first_light',
    name: 'First Light',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'WIZARD_COMPLETED' &&
      !ctx.badgesEarned.includes('first_light'),
  },
  {
    slug: 'the_speedrunner',
    name: 'The Speedrunner',
    category: 'style',
    isEligible: (event, ctx) =>
      event.action === 'WIZARD_COMPLETED' &&
      !ctx.badgesEarned.includes('the_speedrunner') &&
      (ctx.eventMeta?.wizardDurationMs ?? Infinity) < FOUR_MINUTES_MS,
  },
  {
    slug: 'grand_architect',
    name: 'Grand Architect',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'HEALTH_SCORE_THRESHOLD' &&
      !ctx.badgesEarned.includes('grand_architect') &&
      event.metadata?.['threshold'] === 90,
  },
  {
    slug: 'the_conductor',
    name: 'The Conductor',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'VENDOR_CONFIRMED' &&
      !ctx.badgesEarned.includes('the_conductor') &&
      (ctx.eventMeta?.confirmedVendorCount ?? 0) >= 3,
  },
  {
    slug: 'the_maximalist',
    name: 'The Maximalist',
    category: 'style',
    isEligible: (event, ctx) =>
      event.action === 'VENDOR_CONFIRMED' &&
      !ctx.badgesEarned.includes('the_maximalist') &&
      (ctx.eventMeta?.confirmedVendorCount ?? 0) >= 10,
  },
  {
    slug: 'the_minimalist',
    name: 'The Minimalist',
    category: 'style',
    isEligible: (event, ctx) =>
      event.action === 'HEALTH_SCORE_THRESHOLD' &&
      !ctx.badgesEarned.includes('the_minimalist') &&
      event.metadata?.['threshold'] === 90 &&
      (ctx.eventMeta?.budgetEur ?? Infinity) < 2000,
  },
  {
    slug: 'maestro_di_tavola',
    name: 'Maestro di Tavola',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'SECTION_COMPLETED' &&
      !ctx.badgesEarned.includes('maestro_di_tavola') &&
      event.metadata?.['sectionKey'] === 'guest_dietary_complete',
  },
  {
    slug: 'all_weather_planner',
    name: 'All-Weather Planner',
    category: 'milestone',
    isEligible: (event, ctx) =>
      event.action === 'SECTION_COMPLETED' &&
      !ctx.badgesEarned.includes('all_weather_planner') &&
      event.metadata?.['sectionKey'] === 'contingency_plan' &&
      (ctx.eventMeta?.isOutdoor ?? false),
  },
];

export function checkBadgeEligibility(
  event: GamificationEvent,
  context: AwardContext
): string[] {
  return BADGE_DEFINITIONS.filter((badge) =>
    badge.isEligible(event, context)
  ).map((badge) => badge.slug);
}
