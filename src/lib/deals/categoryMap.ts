import type { DealCategory } from '@/types/deals.types';

const CATEGORY_MAP: Record<string, DealCategory[]> = {
  wedding: [
    'accommodation',
    'venues',
    'catering',
    'florists',
    'eventPlanners',
    'decor',
  ],
  anniversary: ['accommodation', 'venues', 'catering', 'florists', 'decor'],
  corporate: ['accommodation', 'venues', 'catering', 'eventPlanners', 'decor'],
  conference: ['accommodation', 'venues', 'catering', 'eventPlanners'],
  birthday: ['venues', 'catering', 'decor'],
  social_gathering: ['venues', 'catering', 'florists', 'decor'],
  other: ['venues', 'catering', 'decor'],
};

const DEFAULT_CATEGORIES: DealCategory[] = ['venues', 'catering', 'decor'];

export function getRelevantCategories(eventType: string): DealCategory[] {
  return CATEGORY_MAP[eventType] ?? DEFAULT_CATEGORIES;
}
