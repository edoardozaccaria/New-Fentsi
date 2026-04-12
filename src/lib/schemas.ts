import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips ASCII control characters (U+0000–U+001F) from free-text strings,
 * preserving tab (0x09), newline (0x0A), and carriage return (0x0D).
 * Prevents injection of control characters in user-supplied text.
 */
const sanitizeString = (s: string) =>
  s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

const sanitizedString = () => z.string().transform(sanitizeString);

// ---------------------------------------------------------------------------
// OnboardingDataSchema
// Validates the full wizard DTO before it is sent to POST /api/generate-plan.
// ---------------------------------------------------------------------------

export const OnboardingDataSchema = z
  .object({
    eventType: z
      .enum([
        'wedding',
        'birthday',
        'anniversary',
        'corporate',
        'christening',
        'graduation',
        'other',
      ])
      .nullable(),

    eventDate: z.string().nullable(),

    guestsCount: z.number().int().min(1).max(5000),

    /** Total event budget in EUR. Hard floor: €500. */
    budget: z.number().min(500).max(500_000),

    locationType: z.enum(['chosen', 'ideas', 'help']).nullable(),

    locationDetails: sanitizedString(),

    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
    locationPlaceId: z.string().optional(),

    styles: z.array(
      z.enum([
        'romantic',
        'modern',
        'rustic',
        'boho',
        'luxury',
        'minimalist',
        'vintage',
        'tropical',
      ])
    ),

    priorities: z.array(
      z.enum([
        'venue',
        'catering',
        'photography',
        'music',
        'decor',
        'video',
        'transport',
        'cake',
        'attire',
        'other',
      ])
    ),

    services: z.array(
      z.enum([
        'catering',
        'dj_music',
        'live_band',
        'photography',
        'video',
        'venue',
        'decor',
        'transport',
        'wedding_cake',
        'mc',
        'planner',
      ])
    ),

    region: z.string().nullable(),

    contactName: sanitizedString(),
    contactEmail: z.string().email(),
    contactPhone: z
      .string()
      .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number'),
  })
  .refine(
    (data) => {
      // lat and lng must be provided together — neither alone is valid.
      const hasLat = data.locationLat !== undefined;
      const hasLng = data.locationLng !== undefined;
      return hasLat === hasLng;
    },
    {
      message:
        'locationLat and locationLng must both be present or both absent',
      path: ['locationLat'],
    }
  );

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;

// ---------------------------------------------------------------------------
// VendorSearchSchema
// ---------------------------------------------------------------------------

export const VendorSearchSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  categories: z.array(
    z.enum([
      'venue',
      'catering',
      'decor',
      'entertainment',
      'av',
      'photo_video',
      'misc',
    ])
  ),
  /** Search radius in metres. Default 5000, max 30000. */
  radius: z.number().int().min(1).max(30_000).default(5_000),
});

export type VendorSearch = z.infer<typeof VendorSearchSchema>;

// ---------------------------------------------------------------------------
// CheckoutSchema
// ---------------------------------------------------------------------------

export const CheckoutSchema = z.object({
  planType: z.enum(['single', 'pro', 'agency']),
  email: z.string().email(),
});

export type Checkout = z.infer<typeof CheckoutSchema>;

// ---------------------------------------------------------------------------
// BookingCheckoutSchema
// ---------------------------------------------------------------------------

export const BookingCheckoutSchema = z.object({
  vendorId: z.string().uuid(),
  planId: z.string().uuid(),
  depositAmount: z.number().min(100),
});

export type BookingCheckout = z.infer<typeof BookingCheckoutSchema>;
