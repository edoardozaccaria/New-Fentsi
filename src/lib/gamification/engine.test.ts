import { describe, it, expect } from 'vitest';
import { computeLevel, LEVEL_THRESHOLDS } from './levels';
import { FP_AWARDS } from './events';

describe('computeLevel', () => {
  it('returns 1 for 0 FP', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('returns 1 for 499 FP', () => {
    expect(computeLevel(499)).toBe(1);
  });

  it('returns 2 at exactly 500 FP', () => {
    expect(computeLevel(500)).toBe(2);
  });

  it('returns 3 at exactly 1500 FP', () => {
    expect(computeLevel(1500)).toBe(3);
  });

  it('returns 4 at exactly 4000 FP', () => {
    expect(computeLevel(4000)).toBe(4);
  });

  it('returns 5 at exactly 10000 FP', () => {
    expect(computeLevel(10000)).toBe(5);
  });

  it('returns 5 for very large FP values', () => {
    expect(computeLevel(999999)).toBe(5);
  });
});

describe('FP_AWARDS', () => {
  it('awards 10 FP for STEP_COMPLETED', () => {
    expect(FP_AWARDS['STEP_COMPLETED']).toBe(10);
  });

  it('awards 100 FP for WIZARD_COMPLETED', () => {
    expect(FP_AWARDS['WIZARD_COMPLETED']).toBe(100);
  });

  it('awards 150 FP for VENDOR_CONFIRMED', () => {
    expect(FP_AWARDS['VENDOR_CONFIRMED']).toBe(150);
  });

  it('covers all GamificationAction values', () => {
    const allActions = [
      'STEP_COMPLETED',
      'WIZARD_COMPLETED',
      'DOMAIN_UNLOCKED',
      'SECTION_COMPLETED',
      'VENDOR_CONFIRMED',
      'RSVP_ACCEPTED',
      'COLLABORATOR_SECTION_COMPLETED',
      'STREAK_MAINTAINED',
      'HEALTH_SCORE_THRESHOLD',
    ];
    for (const action of allActions) {
      expect(FP_AWARDS[action]).toBeTypeOf('number');
      expect(FP_AWARDS[action]).toBeGreaterThan(0);
    }
  });
});

import { checkBadgeEligibility } from './badges';
import type {
  GamificationEvent,
  AwardContext,
} from '@/types/gamification.types';

describe('checkBadgeEligibility', () => {
  const baseContext: AwardContext = {
    careerFpBefore: 0,
    badgesEarned: [],
  };

  it('awards first_light on WIZARD_COMPLETED if not already earned', () => {
    const event: GamificationEvent = {
      action: 'WIZARD_COMPLETED',
      userId: 'u1',
    };
    expect(checkBadgeEligibility(event, baseContext)).toContain('first_light');
  });

  it('does not re-award first_light if already earned', () => {
    const event: GamificationEvent = {
      action: 'WIZARD_COMPLETED',
      userId: 'u1',
    };
    const ctx: AwardContext = { ...baseContext, badgesEarned: ['first_light'] };
    expect(checkBadgeEligibility(event, ctx)).not.toContain('first_light');
  });

  it('awards the_speedrunner when wizard completed in under 4 minutes', () => {
    const event: GamificationEvent = {
      action: 'WIZARD_COMPLETED',
      userId: 'u1',
      metadata: { wizardDurationMs: 3 * 60 * 1000 },
    };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { wizardDurationMs: 3 * 60 * 1000 },
    };
    expect(checkBadgeEligibility(event, ctx)).toContain('the_speedrunner');
  });

  it('does not award the_speedrunner when wizard took more than 4 minutes', () => {
    const event: GamificationEvent = {
      action: 'WIZARD_COMPLETED',
      userId: 'u1',
    };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { wizardDurationMs: 5 * 60 * 1000 },
    };
    expect(checkBadgeEligibility(event, ctx)).not.toContain('the_speedrunner');
  });

  it('awards grand_architect when HEALTH_SCORE_THRESHOLD metadata.threshold is 90', () => {
    const event: GamificationEvent = {
      action: 'HEALTH_SCORE_THRESHOLD',
      userId: 'u1',
      metadata: { threshold: 90 },
    };
    expect(checkBadgeEligibility(event, baseContext)).toContain(
      'grand_architect'
    );
  });

  it('does not award grand_architect for threshold 60', () => {
    const event: GamificationEvent = {
      action: 'HEALTH_SCORE_THRESHOLD',
      userId: 'u1',
      metadata: { threshold: 60 },
    };
    expect(checkBadgeEligibility(event, baseContext)).not.toContain(
      'grand_architect'
    );
  });

  it('awards the_conductor when confirmedVendorCount reaches 3', () => {
    const event: GamificationEvent = {
      action: 'VENDOR_CONFIRMED',
      userId: 'u1',
    };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { confirmedVendorCount: 3 },
    };
    expect(checkBadgeEligibility(event, ctx)).toContain('the_conductor');
  });

  it('does not award the_conductor when confirmedVendorCount is 2', () => {
    const event: GamificationEvent = {
      action: 'VENDOR_CONFIRMED',
      userId: 'u1',
    };
    const ctx: AwardContext = {
      ...baseContext,
      eventMeta: { confirmedVendorCount: 2 },
    };
    expect(checkBadgeEligibility(event, ctx)).not.toContain('the_conductor');
  });

  it('returns empty array for actions with no badge triggers', () => {
    const event: GamificationEvent = { action: 'RSVP_ACCEPTED', userId: 'u1' };
    expect(checkBadgeEligibility(event, baseContext)).toHaveLength(0);
  });
});

import { computeAward } from './engine';

describe('computeAward', () => {
  it('returns correct points and no badge for STEP_COMPLETED', () => {
    const result = computeAward(
      { action: 'STEP_COMPLETED', userId: 'u1' },
      { careerFpBefore: 0, badgesEarned: [] }
    );
    expect(result.points).toBe(10);
    expect(result.badgeSlugs).toHaveLength(0);
    expect(result.newLevel).toBeUndefined();
  });

  it('returns 100 FP and first_light badge on WIZARD_COMPLETED', () => {
    const result = computeAward(
      { action: 'WIZARD_COMPLETED', userId: 'u1' },
      { careerFpBefore: 0, badgesEarned: [] }
    );
    expect(result.points).toBe(100);
    expect(result.badgeSlugs).toContain('first_light');
  });

  it('detects level-up when FP crosses a threshold', () => {
    const result = computeAward(
      { action: 'WIZARD_COMPLETED', userId: 'u1' },
      { careerFpBefore: 490, badgesEarned: ['first_light'] }
    );
    expect(result.newLevel).toBe(2);
  });

  it('returns no newLevel when level does not change', () => {
    const result = computeAward(
      { action: 'STEP_COMPLETED', userId: 'u1' },
      { careerFpBefore: 1000, badgesEarned: [] }
    );
    expect(result.newLevel).toBeUndefined();
  });
});
