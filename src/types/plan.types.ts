// Plan domain types — Fentsi event planning platform.
// All monetary values are in USD.

// ---------------------------------------------------------------------------
// Enums / union literals
// ---------------------------------------------------------------------------

export type EventType =
  | 'wedding'
  | 'birthday'
  | 'corporate'
  | 'social_gathering'
  | 'conference'
  | 'other';

export type EventStyle =
  | 'rustic'
  | 'modern'
  | 'luxury'
  | 'bohemian'
  | 'classic'
  | 'minimalist'
  | 'garden';

export type VenuePreference = 'indoor' | 'outdoor' | 'both' | 'no_preference';

export type RequiredService =
  | 'catering'
  | 'photography'
  | 'videography'
  | 'flowers'
  | 'music_dj'
  | 'lighting'
  | 'transportation'
  | 'planner';

/** The seven spend categories used in the advanced budget wizard. */
export type AllocationCategory =
  | 'venue'
  | 'catering'
  | 'decor'
  | 'entertainment'
  | 'av'
  | 'photo_video'
  | 'misc';

export type AllocationRecord = Record<AllocationCategory, number>;

export type BudgetTier = 'budget' | 'mid-range' | 'premium' | 'luxury';

// ---------------------------------------------------------------------------
// Budget breakdown (AI plan output)
// ---------------------------------------------------------------------------

/** Absolute USD amounts per spend category, as returned by the AI. */
export interface BudgetBreakdown {
  catering: number;
  photography: number;
  video: number;
  venue: number;
  flowers_decor: number;
  music: number;
  transportation: number;
  other: number;
}

// ---------------------------------------------------------------------------
// Vendor / Supplier types
// ---------------------------------------------------------------------------

export interface VendorSuggestion {
  name: string;
  category: string;
  description: string;
  estimatedPriceUsd: number;
  city: string;
  /** Always false for MVP — forward-compatibility flag for future verification. */
  isVerified: boolean;
}

// ---------------------------------------------------------------------------
// Plan / AI output
// ---------------------------------------------------------------------------

export interface TimelineItem {
  date: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
}

/** The full AI-generated event plan returned by POST /api/generate-suppliers. */
export interface EventPlan {
  id: string;
  eventType: EventType;
  eventDate: string;
  guestCount: number;
  city: string;
  venuePreference: VenuePreference;
  budgetUsd: number;
  stylePreferences: EventStyle[];
  requiredServices: RequiredService[];
  specialRequests?: string;
  suppliers: VendorSuggestion[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// DB row shapes (mirrors Supabase table columns)
// ---------------------------------------------------------------------------

/** Mirrors the plan_allocations table row. */
export interface PlanAllocation {
  plan_id: string;
  category: AllocationCategory;
  percent: number;
  amount_usd: number;
}
