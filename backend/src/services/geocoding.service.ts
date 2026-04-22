import { redis } from '../config/redis';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
const USER_AGENT = 'Fentsi-EventPlanner/1.0 (https://fentsi.com)';

export interface GeocodingResult {
  lat: number;
  lng: number;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodeCity(city: string): Promise<GeocodingResult> {
  const cacheKey = `geo:${city.toLowerCase().trim()}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as GeocodingResult;
  }

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set('q', city);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'it'); // Italy-focused

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as NominatimPlace[];

  if (!data.length) {
    throw new Error(`City not found: "${city}". Please check the spelling.`);
  }

  const result: GeocodingResult = {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);

  return result;
}

export default { geocodeCity };
