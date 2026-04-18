import type { DiscoveredSuppliers } from '@/types/supplier-discovery.types';
import { searchFoursquarePlaces } from './foursquare';
import { searchTavilySuppliers } from './tavily';

const FOURSQUARE_CATEGORIES = new Set(['venue', 'catering']);

const TAVILY_QUERIES: Record<string, string> = {
  photography: 'fotografo eventi',
  videography: 'videomaker eventi',
  flowers: 'fiorista eventi',
  music_dj: 'DJ eventi',
  lighting: 'noleggio luci eventi',
  transportation: 'noleggio auto cerimonie',
  planner: 'wedding planner',
};

const FOURSQUARE_QUERIES: Record<string, string> = {
  venue: 'location per eventi',
  catering: 'catering eventi',
};

interface DiscoveryKeys {
  foursquareKey: string;
  tavilyKey: string;
}

export async function discoverSuppliers(
  categories: string[],
  city: string,
  keys: DiscoveryKeys
): Promise<DiscoveredSuppliers> {
  const searches = categories.map(async (cat) => {
    if (FOURSQUARE_CATEGORIES.has(cat)) {
      const query = FOURSQUARE_QUERIES[cat] ?? `${cat} eventi`;
      const results = await searchFoursquarePlaces(
        query,
        city,
        keys.foursquareKey,
        5
      );
      return [cat, results] as const;
    }
    const query = TAVILY_QUERIES[cat] ?? `${cat} eventi`;
    const results = await searchTavilySuppliers(query, city, keys.tavilyKey, 5);
    return [cat, results] as const;
  });

  const entries = await Promise.all(searches);
  return Object.fromEntries(entries);
}
