import type { RealSupplierCandidate } from '@/types/supplier-discovery.types';

const BASE_URL = 'https://api.foursquare.com/v3/places/search';
const FIELDS = 'name,location,rating,website,fsq_id';

export async function searchFoursquarePlaces(
  query: string,
  city: string,
  apiKey: string,
  limit = 5
): Promise<RealSupplierCandidate[]> {
  const params = new URLSearchParams({
    query,
    near: city,
    limit: String(limit),
    fields: FIELDS,
  });

  try {
    const res = await fetch(`${BASE_URL}?${params}`, {
      headers: { Authorization: apiKey, Accept: 'application/json' },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      results: Array<{
        name: string;
        location?: { formatted_address?: string };
        rating?: number;
        website?: string;
      }>;
    };

    return (json.results ?? []).map((r) => ({
      name: r.name,
      address: r.location?.formatted_address,
      rating: r.rating,
      website: r.website,
      snippet: undefined,
      source: 'foursquare' as const,
    }));
  } catch {
    return [];
  }
}
