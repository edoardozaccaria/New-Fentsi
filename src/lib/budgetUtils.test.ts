import { describe, it, expect } from 'vitest';
import {
  percentToUsd,
  usdToPercent,
  clampAllocation,
  sumAllocations,
  calcDepositSuggested,
  getBudgetTier,
  setAllocation,
  DEFAULT_ALLOCATIONS,
  ALLOCATION_CATEGORIES,
} from './budgetUtils';
import type { AllocationRecord } from '@/types/plan.types';

// ---------------------------------------------------------------------------
// percentToUsd
// ---------------------------------------------------------------------------

describe('percentToUsd', () => {
  it('converts 30% of €10 000 to €3 000', () => {
    expect(percentToUsd(30, 10_000)).toBe(3_000);
  });

  it('converts 100% to the full budget', () => {
    expect(percentToUsd(100, 8_000)).toBe(8_000);
  });

  it('converts 0% to €0', () => {
    expect(percentToUsd(0, 15_000)).toBe(0);
  });

  it('handles fractional percentages', () => {
    expect(percentToUsd(12.5, 8_000)).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------
// usdToPercent
// ---------------------------------------------------------------------------

describe('usdToPercent', () => {
  it('converts €2 000 of €10 000 to 20%', () => {
    expect(usdToPercent(2_000, 10_000)).toBe(20);
  });

  it('returns 0 when total budget is 0 (no division by zero)', () => {
    expect(usdToPercent(500, 0)).toBe(0);
  });

  it('returns 100 when eur equals totalBudget', () => {
    expect(usdToPercent(5_000, 5_000)).toBe(100);
  });

  it('returns 0 when eur is 0', () => {
    expect(usdToPercent(0, 10_000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// clampAllocation
// ---------------------------------------------------------------------------

describe('clampAllocation', () => {
  it('returns the value unchanged when within [0, 100]', () => {
    expect(clampAllocation(50)).toBe(50);
    expect(clampAllocation(0)).toBe(0);
    expect(clampAllocation(100)).toBe(100);
  });

  it('clamps negative values to 0', () => {
    expect(clampAllocation(-10)).toBe(0);
    expect(clampAllocation(-0.001)).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    expect(clampAllocation(101)).toBe(100);
    expect(clampAllocation(999)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// sumAllocations
// ---------------------------------------------------------------------------

describe('sumAllocations', () => {
  it('default allocations sum to exactly 100', () => {
    expect(sumAllocations(DEFAULT_ALLOCATIONS)).toBe(100);
  });

  it('sums a custom allocation correctly', () => {
    const alloc: AllocationRecord = {
      venue: 25,
      catering: 25,
      decor: 10,
      entertainment: 10,
      av: 10,
      photo_video: 10,
      misc: 10,
    };
    expect(sumAllocations(alloc)).toBe(100);
  });

  it('returns 0 for all-zero allocations', () => {
    const alloc: AllocationRecord = {
      venue: 0,
      catering: 0,
      decor: 0,
      entertainment: 0,
      av: 0,
      photo_video: 0,
      misc: 0,
    };
    expect(sumAllocations(alloc)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calcDepositSuggested
// ---------------------------------------------------------------------------

describe('calcDepositSuggested', () => {
  it('returns €500 floor for very small budgets', () => {
    // 20% of €500 = €100 → floor applies
    expect(calcDepositSuggested(500)).toBe(500);
    // 20% of €1 000 = €200 → floor applies
    expect(calcDepositSuggested(1_000)).toBe(500);
    // 20% of €2 000 = €400 → floor applies
    expect(calcDepositSuggested(2_000)).toBe(500);
  });

  it('returns 20% for moderate budgets, rounded to nearest €100', () => {
    // 20% of €3 000 = €600
    expect(calcDepositSuggested(3_000)).toBe(600);
    // 20% of €10 000 = €2 000
    expect(calcDepositSuggested(10_000)).toBe(2_000);
    // 20% of €50 000 = €10 000
    expect(calcDepositSuggested(50_000)).toBe(10_000);
  });

  it('rounds to the nearest €100', () => {
    // 20% of €3 250 = €650 → rounds to €700 (0.20/100 * 3250 = 6.5 → round → 7 → *100 = 700)
    expect(calcDepositSuggested(3_250)).toBe(700);
    // 20% of €3 100 = €620 → rounds to €600 (0.20/100 * 3100 = 6.2 → round → 6 → *100 = 600)
    expect(calcDepositSuggested(3_100)).toBe(600);
  });

  it('never returns less than €500', () => {
    for (const budget of [500, 750, 1_000, 1_500, 2_000, 2_499]) {
      expect(calcDepositSuggested(budget)).toBeGreaterThanOrEqual(500);
    }
  });
});

// ---------------------------------------------------------------------------
// getBudgetTier
// ---------------------------------------------------------------------------

describe('getBudgetTier', () => {
  it('returns "budget" when spend per guest < €40', () => {
    // €3 900 / 100 guests = €39/guest
    expect(getBudgetTier(3_900, 100)).toBe('budget');
  });

  it('returns "mid-range" when spend per guest is €40–€79', () => {
    // €4 000 / 100 = €40/guest (boundary — inclusive lower bound)
    expect(getBudgetTier(4_000, 100)).toBe('mid-range');
    // €7 900 / 100 = €79/guest
    expect(getBudgetTier(7_900, 100)).toBe('mid-range');
  });

  it('returns "premium" when spend per guest is €80–€149', () => {
    expect(getBudgetTier(8_000, 100)).toBe('premium');
    expect(getBudgetTier(14_900, 100)).toBe('premium');
  });

  it('returns "luxury" when spend per guest is ≥ €150', () => {
    expect(getBudgetTier(15_000, 100)).toBe('luxury');
    expect(getBudgetTier(100_000, 50)).toBe('luxury');
  });

  it('returns "budget" when guestsCount is 0 or negative (guard)', () => {
    expect(getBudgetTier(10_000, 0)).toBe('budget');
    expect(getBudgetTier(10_000, -1)).toBe('budget');
  });
});

// ---------------------------------------------------------------------------
// setAllocation — no rebalance
// ---------------------------------------------------------------------------

describe('setAllocation (autoRebalance = false)', () => {
  it('sets the category to the new value without touching others', () => {
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 40, false);
    expect(result.venue).toBe(40);
    // other categories unchanged
    expect(result.catering).toBe(DEFAULT_ALLOCATIONS.catering);
    expect(result.decor).toBe(DEFAULT_ALLOCATIONS.decor);
  });

  it('clamps values above 100', () => {
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 150, false);
    expect(result.venue).toBe(100);
  });

  it('clamps negative values to 0', () => {
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', -5, false);
    expect(result.venue).toBe(0);
  });

  it('does not rebalance on a decrease even when autoRebalance is true', () => {
    // Decreasing venue from 30 to 10 should NOT touch other categories
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 10, true);
    expect(result.venue).toBe(10);
    expect(result.catering).toBe(DEFAULT_ALLOCATIONS.catering);
  });
});

// ---------------------------------------------------------------------------
// setAllocation — with rebalance
// ---------------------------------------------------------------------------

describe('setAllocation (autoRebalance = true, delta > 0)', () => {
  it('sum of all allocations stays ≤ 100 after an increase', () => {
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 60, true);
    expect(sumAllocations(result)).toBeLessThanOrEqual(100);
  });

  it('sum stays close to 100 (within float tolerance)', () => {
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'catering', 70, true);
    expect(sumAllocations(result)).toBeCloseTo(100, 5);
  });

  it('the modified category gets the requested value', () => {
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 50, true);
    expect(result.venue).toBe(50);
  });

  it('no category goes below 0', () => {
    // Force a large increase to stress-test clamping
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 95, true);
    for (const cat of ALLOCATION_CATEGORIES) {
      expect(result[cat]).toBeGreaterThanOrEqual(0);
    }
  });

  it('no category exceeds 100', () => {
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 95, true);
    for (const cat of ALLOCATION_CATEGORIES) {
      expect(result[cat]).toBeLessThanOrEqual(100);
    }
  });

  it('reduces other categories proportionally', () => {
    // venue: 30→50, delta = 20. Others sum = 70.
    // catering should drop by 20 × (30/70) ≈ 8.57 → ~21.43
    const result = setAllocation(DEFAULT_ALLOCATIONS, 'venue', 50, true);
    const expectedCatering = 30 - 20 * (30 / 70);
    expect(result.catering).toBeCloseTo(expectedCatering, 5);
  });

  it('reduces the only non-zero category when all others are zero', () => {
    // venue=100, everything else=0. Increasing catering by 20 means
    // venue is the sole "other" with a non-zero value — it absorbs the full delta.
    const allZero: AllocationRecord = {
      venue: 100,
      catering: 0,
      decor: 0,
      entertainment: 0,
      av: 0,
      photo_video: 0,
      misc: 0,
    };
    const result = setAllocation(allZero, 'catering', 20, true);
    expect(result.catering).toBe(20);
    // venue is the only source, so it absorbs the full delta: 100 - 20 = 80
    expect(result.venue).toBe(80);
    expect(sumAllocations(result)).toBeCloseTo(100, 5);
  });

  it('does not rebalance when every other category is already 0 (sumOthers = 0)', () => {
    // All categories 0 — nothing to rebalance from.
    const allEmpty: AllocationRecord = {
      venue: 0,
      catering: 0,
      decor: 0,
      entertainment: 0,
      av: 0,
      photo_video: 0,
      misc: 0,
    };
    const result = setAllocation(allEmpty, 'catering', 30, true);
    expect(result.catering).toBe(30);
    // All others remain 0 — there was nothing to take from
    for (const cat of ALLOCATION_CATEGORIES) {
      if (cat !== 'catering') expect(result[cat]).toBe(0);
    }
  });

  it('does not mutate the original allocations object', () => {
    const original = { ...DEFAULT_ALLOCATIONS };
    setAllocation(DEFAULT_ALLOCATIONS, 'venue', 50, true);
    expect(DEFAULT_ALLOCATIONS).toEqual(original);
  });
});
