export interface RealSupplierCandidate {
  name: string;
  address?: string;
  rating?: number;
  website?: string;
  snippet?: string;
  source: 'foursquare' | 'tavily';
}

export type DiscoveredSuppliers = Record<string, RealSupplierCandidate[]>;
