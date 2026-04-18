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
