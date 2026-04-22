/** A complete AI-generated event plan. */
export interface EventPlan {
  id: string;
  title: string;
  summary: string;
  event_type: string;
  event_date: string;
  guest_count: number;
  location_city: string;
  budget: BudgetBreakdown;
  timeline: TimelineItem[];
  vendor_recommendations: VendorScore[];
  ai_tips: AiTip[];
  created_at: string;
  updated_at: string;
}

/** Top-level budget info with per-category breakdown. */
export interface BudgetBreakdown {
  total: number;
  currency: string;
  items: BudgetBreakdownItem[];
}

/** Single budget line item. */
export interface BudgetBreakdownItem {
  category: string;
  label: string;
  estimated_cost: number;
  percentage: number;
  notes?: string;
}

/** An item on the event day timeline. */
export interface TimelineItem {
  time: string;
  title: string;
  description: string;
  duration_minutes: number;
  category?: string;
}

/** AI-generated tip or suggestion. */
export interface AiTip {
  id: string;
  category: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
}

/** Scored vendor recommendation. */
export interface VendorScore {
  vendor_id: string;
  name: string;
  category: string;
  score: number;
  price_range: string;
  location: string;
  website?: string;
  phone?: string;
  foursquare_id?: string;
  photo_url?: string;
  reason: string;
}
