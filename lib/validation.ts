/**
 * Zod schemas for runtime validation of all API inputs.
 *
 * These schemas protect against:
 * - Malformed payloads crashing the server
 * - Prompt injection via oversized/crafted strings
 * - Unexpected types bypassing TypeScript (which is compile-time only)
 */

import { z } from 'zod'

// ── Shared string sanitizer ─────────────────────────────────────────────────
// Limits length and strips control characters to prevent prompt injection
const safeString = (max: number) =>
  z.string().max(max).transform((s) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''))

// ── OnboardingData schema ───────────────────────────────────────────────────
export const OnboardingDataSchema = z.object({
  eventType: z.enum(['wedding', 'birthday', 'anniversary', 'corporate', 'christening', 'graduation', 'other']).nullable(),
  eventDate: safeString(30).nullable(),
  guestsCount: z.number().int().min(1).max(10000),
  budget: z.number().min(0).max(10_000_000),
  locationType: z.enum(['chosen', 'ideas', 'help']).nullable(),
  locationDetails: safeString(500),
  styles: z.array(z.enum(['romantic', 'modern', 'rustic', 'boho', 'luxury', 'minimalist', 'vintage', 'tropical'])).max(8),
  priorities: z.array(z.enum(['food_drinks', 'photography', 'venue', 'music_entertainment', 'flowers_decor', 'outfit_look', 'honeymoon', 'budget_savings'])).max(8),
  services: z.array(z.enum(['catering', 'photography', 'video', 'dj_music', 'flowers_decor', 'wedding_cake', 'wedding_planner', 'transport', 'entertainment', 'lighting'])).max(10),
  region: safeString(200).nullable(),
  locationLat: z.number().min(-90).max(90).nullable(),
  locationLng: z.number().min(-180).max(180).nullable(),
  locationPlaceId: safeString(100).nullable(),
  contactName: safeString(200),
  contactEmail: z.string().email().max(320),
  contactPhone: safeString(30),
})

export type ValidatedOnboardingData = z.infer<typeof OnboardingDataSchema>

// ── Vendor search schema ────────────────────────────────────────────────────
export const VendorSearchSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  categories: z.array(safeString(50)).min(1).max(15),
  eventType: safeString(50).optional(),
  style: safeString(50).optional(),
  budget: z.number().min(0).max(10_000_000).optional(),
  radiusMeters: z.number().int().min(100).max(100_000).default(40000),
})

// ── Checkout schema ─────────────────────────────────────────────────────────
export const CheckoutSchema = z.object({
  planType: z.enum(['single', 'pro', 'agency']),
  email: z.string().email().max(320),
})

// ── Booking checkout schema ─────────────────────────────────────────────────
export const BookingCheckoutSchema = z.object({
  vendors: z.array(z.object({
    name: safeString(200),
    category: safeString(100),
    website: safeString(500).optional(),
  })).min(1).max(50),
  eventTitle: safeString(500).optional(),
  email: z.string().email().max(320),
  name: safeString(200).optional(),
  message: safeString(1000).optional(),
})
