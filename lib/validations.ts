/**
 * Input validation helpers for API routes and forms.
 * Validates at system boundaries to prevent bad data from reaching the AI or database.
 */

import { OnboardingData, EventType, LocationType, EventStyle, EventPriority, EventService } from '@/types/event'

// ── Constants ───────────────────────────────────────────────────────────────
const VALID_EVENT_TYPES: EventType[] = ['wedding', 'birthday', 'anniversary', 'corporate', 'christening', 'graduation', 'other']
const VALID_LOCATION_TYPES: LocationType[] = ['chosen', 'ideas', 'help']
const VALID_STYLES: EventStyle[] = ['romantic', 'modern', 'rustic', 'boho', 'luxury', 'minimalist', 'vintage', 'tropical']
const VALID_PRIORITIES: EventPriority[] = ['food_drinks', 'photography', 'venue', 'music_entertainment', 'flowers_decor', 'outfit_look', 'honeymoon', 'budget_savings']
const VALID_SERVICES: EventService[] = ['catering', 'photography', 'video', 'dj_music', 'flowers_decor', 'wedding_cake', 'wedding_planner', 'transport', 'entertainment', 'lighting']

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BUDGET = 500_000
const MIN_BUDGET = 500
const MAX_GUESTS = 10_000
const MIN_GUESTS = 1
const MAX_STRING_LENGTH = 500

// ── Sanitize string input ───────────────────────────────────────────────────
export function sanitizeString(input: unknown, maxLength = MAX_STRING_LENGTH): string {
  if (typeof input !== 'string') return ''
  return input.trim().slice(0, maxLength)
}

// ── Validate email ──────────────────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254
}

// ── Validate OnboardingData from API request ────────────────────────────────
export function validateOnboardingData(raw: unknown): { valid: true; data: OnboardingData } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const body = raw as Record<string, unknown>

  // Event type
  const eventType = body.eventType as string | null
  if (eventType && !VALID_EVENT_TYPES.includes(eventType as EventType)) {
    return { valid: false, error: `Invalid eventType: ${sanitizeString(eventType, 30)}` }
  }

  // Budget
  const budget = typeof body.budget === 'number' ? body.budget : 20000
  if (budget < MIN_BUDGET || budget > MAX_BUDGET) {
    return { valid: false, error: `Budget must be between ${MIN_BUDGET} and ${MAX_BUDGET}` }
  }

  // Guests
  const guestsCount = typeof body.guestsCount === 'number' ? body.guestsCount : 100
  if (guestsCount < MIN_GUESTS || guestsCount > MAX_GUESTS) {
    return { valid: false, error: `Guest count must be between ${MIN_GUESTS} and ${MAX_GUESTS}` }
  }

  // Location type
  const locationType = body.locationType as string | null
  if (locationType && !VALID_LOCATION_TYPES.includes(locationType as LocationType)) {
    return { valid: false, error: 'Invalid locationType' }
  }

  // Styles
  const styles = Array.isArray(body.styles)
    ? (body.styles as string[]).filter((s) => VALID_STYLES.includes(s as EventStyle))
    : []

  // Priorities
  const priorities = Array.isArray(body.priorities)
    ? (body.priorities as string[]).filter((p) => VALID_PRIORITIES.includes(p as EventPriority))
    : []

  // Services
  const services = Array.isArray(body.services)
    ? (body.services as string[]).filter((s) => VALID_SERVICES.includes(s as EventService))
    : []

  // Lat/Lng
  const locationLat = typeof body.locationLat === 'number' && Math.abs(body.locationLat) <= 90 ? body.locationLat : null
  const locationLng = typeof body.locationLng === 'number' && Math.abs(body.locationLng) <= 180 ? body.locationLng : null

  // Contact
  const contactEmail = sanitizeString(body.contactEmail, 254)
  if (contactEmail && !isValidEmail(contactEmail)) {
    return { valid: false, error: 'Invalid email address' }
  }

  const data: OnboardingData = {
    eventType: (eventType as EventType) ?? null,
    eventDate: typeof body.eventDate === 'string' ? sanitizeString(body.eventDate, 30) : null,
    guestsCount: Math.round(guestsCount),
    budget: Math.round(budget),
    locationType: (locationType as LocationType) ?? null,
    locationDetails: sanitizeString(body.locationDetails),
    styles: styles as EventStyle[],
    priorities: priorities as EventPriority[],
    services: services as EventService[],
    region: typeof body.region === 'string' ? sanitizeString(body.region, 200) : null,
    locationLat,
    locationLng,
    locationPlaceId: typeof body.locationPlaceId === 'string' ? sanitizeString(body.locationPlaceId, 100) : null,
    contactName: sanitizeString(body.contactName, 100),
    contactEmail,
    contactPhone: sanitizeString(body.contactPhone, 20),
  }

  return { valid: true, data }
}

// ── Validate vendor search request ──────────────────────────────────────────
export function validateVendorSearch(raw: unknown): { valid: true; data: { lat: number; lng: number; categories: string[]; radiusMeters: number; eventType?: string; style?: string; budget?: number } } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const body = raw as Record<string, unknown>

  const lat = typeof body.lat === 'number' ? body.lat : NaN
  const lng = typeof body.lng === 'number' ? body.lng : NaN

  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { valid: false, error: 'Valid lat and lng are required' }
  }

  if (!Array.isArray(body.categories) || body.categories.length === 0) {
    return { valid: false, error: 'At least one category is required' }
  }

  // Sanitize categories (only allow known ones)
  const categories = (body.categories as string[])
    .map((c) => sanitizeString(c, 50))
    .filter(Boolean)
    .slice(0, 15)

  const radiusMeters = typeof body.radiusMeters === 'number'
    ? Math.min(Math.max(body.radiusMeters, 1000), 100000)
    : 40000

  return {
    valid: true,
    data: {
      lat,
      lng,
      categories,
      radiusMeters,
      eventType: typeof body.eventType === 'string' ? sanitizeString(body.eventType, 50) : undefined,
      style: typeof body.style === 'string' ? sanitizeString(body.style, 50) : undefined,
      budget: typeof body.budget === 'number' ? body.budget : undefined,
    },
  }
}

// ── Validate checkout request ───────────────────────────────────────────────
export function validateCheckoutRequest(raw: unknown): { valid: true; data: { planType: string; email: string } } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const body = raw as Record<string, unknown>

  const planType = sanitizeString(body.planType, 20)
  if (!['single', 'pro', 'agency'].includes(planType)) {
    return { valid: false, error: 'Invalid plan type' }
  }

  const email = sanitizeString(body.email, 254)
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Valid email is required' }
  }

  return { valid: true, data: { planType, email } }
}

// ── Validate booking request ────────────────────────────────────────────────
export function validateBookingRequest(raw: unknown): { valid: true; data: { vendors: { name: string; category: string; website?: string }[]; eventTitle: string; email: string; name: string; message: string } } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const body = raw as Record<string, unknown>

  const email = sanitizeString(body.email, 254)
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Valid email is required' }
  }

  if (!Array.isArray(body.vendors) || body.vendors.length === 0) {
    return { valid: false, error: 'At least one vendor is required' }
  }

  const vendors = (body.vendors as Record<string, unknown>[]).slice(0, 20).map((v) => ({
    name: sanitizeString(v.name, 100),
    category: sanitizeString(v.category, 50),
    website: typeof v.website === 'string' ? sanitizeString(v.website, 500) : undefined,
  }))

  return {
    valid: true,
    data: {
      vendors,
      eventTitle: sanitizeString(body.eventTitle, 500),
      email,
      name: sanitizeString(body.name, 100),
      message: sanitizeString(body.message, 1000),
    },
  }
}
