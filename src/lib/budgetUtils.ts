// Pure budget calculation functions — no side effects, no I/O.
// All monetary values are in USD. Percentages are 0–100 (not 0–1).

import type {
  AllocationCategory,
  AllocationRecord,
  BudgetTier,
} from '@/types/plan.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALLOCATION_CATEGORIES: AllocationCategory[] = [
  'venue',
  'catering',
  'decor',
  'entertainment',
  'av',
  'photo_video',
  'misc',
];

/** Default percentage split used by the advanced wizard on first load. Sums to 100. */
export const DEFAULT_ALLOCATIONS: AllocationRecord = {
  venue: 30,
  catering: 30,
  decor: 15,
  entertainment: 10,
  av: 5,
  photo_video: 5,
  misc: 5,
};

// ---------------------------------------------------------------------------
// Basic conversions
// ---------------------------------------------------------------------------

/** Convert a percentage allocation to an absolute USD amount. */
export function percentToUsd(percent: number, totalBudget: number): number {
  return (totalBudget * percent) / 100;
}

/** Convert an absolute USD amount back to a percentage of the total budget. */
export function usdToPercent(usd: number, totalBudget: number): number {
  if (totalBudget === 0) return 0;
  return (usd / totalBudget) * 100;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp an allocation percentage to [0, 100]. */
export function clampAllocation(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Sum all allocation percentages across every category. */
export function sumAllocations(allocations: AllocationRecord): number {
  return ALLOCATION_CATEGORIES.reduce((sum, cat) => sum + allocations[cat], 0);
}

// ---------------------------------------------------------------------------
// Deposit calculation
// ---------------------------------------------------------------------------

/**
 * Suggested deposit for a booking.
 *
 * Formula: max(500, round(totalBudget × 0.20 / 100) × 100)
 *
 * Yields 20% of the budget rounded to the nearest $100, with a floor of $500.
 */
export function calcDepositSuggested(totalBudget: number): number {
  return Math.max(500, Math.round((totalBudget * 0.2) / 100) * 100);
}

// ---------------------------------------------------------------------------
// Budget tier
// ---------------------------------------------------------------------------

/**
 * Classify a budget into a qualitative tier based on spend-per-guest (USD).
 *
 * Thresholds:
 *   < $40  / guest → "budget"
 *   < $80  / guest → "mid-range"
 *   < $150 / guest → "premium"
 *   ≥ $150 / guest → "luxury"
 */
export function getBudgetTier(
  totalBudget: number,
  guestsCount: number
): BudgetTier {
  if (guestsCount <= 0) return 'budget';
  const perGuest = totalBudget / guestsCount;
  if (perGuest < 40) return 'budget';
  if (perGuest < 80) return 'mid-range';
  if (perGuest < 150) return 'premium';
  return 'luxury';
}

// ---------------------------------------------------------------------------
// Live budget breakdown preview (used by wizard Step 6)
// ---------------------------------------------------------------------------

export interface BudgetPreviewLine {
  category: AllocationCategory;
  label: string;
  percent: number;
  amountUsd: number;
}

const CATEGORY_LABELS: Record<AllocationCategory, string> = {
  venue: 'Venue',
  catering: 'Catering',
  decor: 'Décor & Flowers',
  entertainment: 'Entertainment',
  av: 'A/V & Lighting',
  photo_video: 'Photo & Video',
  misc: 'Misc / Buffer',
};

export function getBudgetPreview(
  totalBudget: number,
  allocations: AllocationRecord = DEFAULT_ALLOCATIONS
): BudgetPreviewLine[] {
  return ALLOCATION_CATEGORIES.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    percent: allocations[cat],
    amountUsd: percentToUsd(allocations[cat], totalBudget),
  }));
}

// ---------------------------------------------------------------------------
// Auto-rebalance algorithm
// ---------------------------------------------------------------------------

/**
 * Update one category's allocation and optionally rebalance the others
 * so that the total stays at (or near) 100%.
 */
export function setAllocation(
  allocations: AllocationRecord,
  category: AllocationCategory,
  newPercent: number,
  autoRebalance: boolean
): AllocationRecord {
  const clamped = clampAllocation(newPercent);
  const delta = clamped - allocations[category];

  if (!autoRebalance || delta <= 0) {
    return { ...allocations, [category]: clamped };
  }

  const others = ALLOCATION_CATEGORIES.filter(
    (cat) => cat !== category && allocations[cat] > 0
  );
  const sumOthers = others.reduce((sum, cat) => sum + allocations[cat], 0);

  if (sumOthers === 0) {
    return { ...allocations, [category]: clamped };
  }

  const next: AllocationRecord = { ...allocations };

  for (const cat of others) {
    const reduction = delta * (allocations[cat] / sumOthers);
    next[cat] = clampAllocation(allocations[cat] - reduction);
  }
  next[category] = clamped;

  const total = sumAllocations(next);
  if (total > 100) {
    const factor = 100 / total;
    for (const cat of ALLOCATION_CATEGORIES) {
      next[cat] = clampAllocation(next[cat] * factor);
    }
  }

  return next;
}
