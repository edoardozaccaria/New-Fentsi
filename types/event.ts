export type EventType =
  | 'wedding'
  | 'birthday'
  | 'anniversary'
  | 'corporate'
  | 'christening'
  | 'graduation'
  | 'other'

export type LocationType = 'chosen' | 'ideas' | 'help'

export type EventStyle =
  | 'romantic'
  | 'modern'
  | 'rustic'
  | 'boho'
  | 'luxury'
  | 'minimalist'
  | 'vintage'
  | 'tropical'

export type EventService =
  | 'catering'
  | 'photography'
  | 'video'
  | 'dj_music'
  | 'flowers_decor'
  | 'wedding_cake'
  | 'wedding_planner'
  | 'transport'
  | 'entertainment'
  | 'lighting'

export type EventPriority =
  | 'food_drinks'
  | 'photography'
  | 'venue'
  | 'music_entertainment'
  | 'flowers_decor'
  | 'outfit_look'
  | 'honeymoon'
  | 'budget_savings'

export interface OnboardingData {
  // Step 1
  eventType: EventType | null
  // Step 2
  eventDate: string | null
  // Step 3
  guestsCount: number
  // Step 4
  budget: number
  // Step 5
  locationType: LocationType | null
  locationDetails: string
  // Step 6
  styles: EventStyle[]
  // Step 7
  priorities: EventPriority[]
  // Step 8
  services: EventService[]
  // Step 9 — enriched with Google Places geocoding
  region: string | null           // human-readable city "Florence, Italy"
  locationLat: number | null      // latitude from Google Places Autocomplete
  locationLng: number | null      // longitude from Google Places Autocomplete
  locationPlaceId: string | null  // Google Place ID of the city
  // Step 10
  contactName: string
  contactEmail: string
  contactPhone: string
}

export interface BudgetBreakdown {
  catering: number
  photography: number
  video: number
  venue: number
  flowers_decor: number
  music: number
  wedding_cake: number
  attire: number
  transport: number
  other: number
}

// ── Raw Google Places API response shape ─────────────────────────────────────
export interface GooglePlace {
  id: string
  displayName: { text: string; languageCode: string }
  formattedAddress: string
  rating?: number
  userRatingCount?: number
  websiteUri?: string
  internationalPhoneNumber?: string
  priceLevel?:
    | 'PRICE_LEVEL_FREE'
    | 'PRICE_LEVEL_INEXPENSIVE'
    | 'PRICE_LEVEL_MODERATE'
    | 'PRICE_LEVEL_EXPENSIVE'
    | 'PRICE_LEVEL_VERY_EXPENSIVE'
  editorialSummary?: { text: string; languageCode: string }
  photos?: { name: string; widthPx: number; heightPx: number }[]
  googleMapsUri?: string
}

// ── Vendor enriched for the plan (combines Google Places + AI reasoning) ─────
export interface VendorSuggestion {
  // Core (always present)
  name: string
  category: string
  description: string
  priceRange: string   // e.g. "€€" or "€1,200 – €2,800"
  rating: number
  tags: string[]
  // Google Places enrichment (present when real data available)
  googlePlaceId?: string
  address?: string
  phone?: string
  website?: string
  googleMapsUri?: string
  reviewCount?: number
  photoUrl?: string         // resolved Google Places photo URL
  // AI reasoning
  whyRecommended?: string   // 1-sentence AI explanation
  budgetAllocation?: number // euro amount allocated from budget
  // Product links for decorative / product-heavy categories (Amazon.it searches)
  productLinks?: { title: string; url: string; description: string }[]
}

export interface EventPlan {
  id: string
  title: string
  summary: string
  budgetBreakdown: BudgetBreakdown
  vendors: VendorSuggestion[]
  timeline: { date: string; task: string; priority: 'high' | 'medium' | 'low' }[]
  tips: string[]
  score: number
  createdAt: string
  // Metadata
  vendorsFromGooglePlaces?: boolean
  locationDisplay?: string
}

export interface FentsiEvent {
  id: string
  userId?: string
  data: OnboardingData
  plan?: EventPlan
  status: 'draft' | 'planning' | 'completed'
  createdAt: string
  updatedAt: string
}

// ── Vendor search API types ───────────────────────────────────────────────────
export interface VendorSearchRequest {
  lat: number
  lng: number
  category: string      // 'venue' | 'catering' | 'photography' | etc.
  eventType: string
  style?: string
  budget?: number
  radiusMeters?: number
}

export interface VendorCategoryResult {
  category: string
  vendors: VendorSuggestion[]
}
