// Candidate supplier returned by external APIs before Claude curation.

export interface RealSupplierCandidate {
  name: string;
  address?: string;
  rating?: number;    // 0–10 scale, normalised
  website?: string;
  snippet?: string;   // Short description scraped by Tavily
  source: 'foursquare' | 'tavily';
}

// Keyed by service category string (matches RequiredService in plan.types.ts)
export type DiscoveredSuppliers = Record<string, RealSupplierCandidate[]>;
