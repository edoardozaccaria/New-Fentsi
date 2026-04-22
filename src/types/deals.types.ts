// src/types/deals.types.ts

export type DealSource = 'booking' | 'amazon' | 'google_maps';

export interface LinkOption {
  label: string;
  url: string;
  source: DealSource;
}

export interface DealLinks {
  accommodation: LinkOption[];
  venues: LinkOption[];
  catering: LinkOption[];
  florists: LinkOption[];
  eventPlanners: LinkOption[];
  decor: LinkOption[];
}

export type DealCategory = keyof DealLinks;

export interface DealLinksInput {
  location: string;
  eventType: string;
  guestCount: number;
  eventDate: string | null;
  style: string;
  budget: number;
}
