import type { AllocationCategory } from "@/types/plans";

export const MIN_BUDGET = 300;

export type AllocationMap = Record<AllocationCategory, number>;

export function getRemainingBudgetPercent(allocations: AllocationMap): number {
  const total = Object.values(allocations).reduce((sum, v) => sum + v, 0);
  return 100 - total;
}

export function calculateAllocationAmounts(
  totalBudget: number,
  allocations: AllocationMap,
): AllocationMap {
  const result = {} as AllocationMap;
  for (const [key, percent] of Object.entries(allocations) as [AllocationCategory, number][]) {
    result[key] = Math.round((totalBudget * percent) / 100);
  }
  return result;
}

export function updateAllocations({
  allocations,
  category,
  nextPercent,
  autoRebalance,
}: {
  allocations: AllocationMap;
  category: AllocationCategory;
  nextPercent: number;
  autoRebalance: boolean;
}): AllocationMap {
  const clamped = Math.min(100, Math.max(0, nextPercent));
  const prev = allocations[category] ?? 0;
  const delta = clamped - prev;
  const next = { ...allocations, [category]: clamped };

  if (!autoRebalance || delta === 0) return next;

  const others = (Object.keys(next) as AllocationCategory[]).filter(
    (k) => k !== category && next[k] > 0,
  );
  if (others.length === 0) return next;

  const totalOthers = others.reduce((sum, k) => sum + next[k], 0);
  if (totalOthers === 0) return next;

  for (const k of others) {
    const share = next[k] / totalOthers;
    next[k] = Math.max(0, Math.round(next[k] - delta * share));
  }

  return next;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
