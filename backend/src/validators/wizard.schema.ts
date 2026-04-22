import { z } from 'zod';

export const eventTypeEnum = z.enum([
  'wedding',
  'birthday',
  'corporate',
  'party',
  'graduation',
  'baby_shower',
  'anniversary',
  'other',
]);

export const venuePreferenceEnum = z.enum([
  'indoor',
  'outdoor',
  'both',
  'surprise_me',
]);

export const aestheticStyleEnum = z.enum([
  'rustic',
  'elegant',
  'minimalist',
  'bohemian',
  'industrial',
  'luxury',
  'fun',
  'vintage',
  'modern',
  'romantic',
]);

export const priorityEnum = z.enum([
  'catering',
  'music',
  'photography',
  'decor',
  'venue',
  'experience',
  'budget_optimization',
]);

export const serviceEnum = z.enum([
  'dj',
  'live_music',
  'photographer',
  'videographer',
  'catering',
  'florist',
  'cake',
  'mc',
  'lighting',
  'transport',
  'none',
]);

export const wizardSchema = z.object({
  /** 1. Type of event */
  event_type: eventTypeEnum,

  /** 2. Date or date range (e.g. "2026-06-15" or "2026-06-15 to 2026-06-17") */
  event_date: z.string().min(1, 'Event date is required'),

  /** 3. Number of guests */
  guest_count: z
    .number({ required_error: 'Guest count is required' })
    .int()
    .min(1, 'At least 1 guest is required')
    .max(2000, 'Maximum 2000 guests'),

  /** 4. Total budget in EUR */
  budget_total: z
    .number({ required_error: 'Budget is required' })
    .min(100, 'Minimum budget is €100')
    .max(1_000_000, 'Maximum budget is €1,000,000'),

  /** 5. City / location */
  location_city: z
    .string()
    .min(2, 'City name must be at least 2 characters')
    .max(100, 'City name must be at most 100 characters'),

  /** 6. Venue preference */
  venue_preference: venuePreferenceEnum,

  /** 7. Aesthetic styles (pick 1-3) */
  aesthetic_style: z
    .array(aestheticStyleEnum)
    .min(1, 'Select at least 1 aesthetic style')
    .max(3, 'Select at most 3 aesthetic styles'),

  /** 8. Top priorities (pick 1-3) */
  top_priorities: z
    .array(priorityEnum)
    .min(1, 'Select at least 1 priority')
    .max(3, 'Select at most 3 priorities'),

  /** 9. Services wanted */
  services_wanted: z.array(serviceEnum).min(1, 'Select at least 1 service'),

  /** 10. Extra notes (optional) */
  extra_notes: z
    .string()
    .max(300, 'Extra notes must be at most 300 characters')
    .optional(),
});

export type WizardInput = z.infer<typeof wizardSchema>;
