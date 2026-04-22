import { redis } from '../config/redis';
import { env } from '../config/env';

// ─── Types ────────────────────────────────────

export interface VendorResult {
  foursquare_id: string;
  name: string;
  category: string;
  vendor_type: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  price_range: 'budget' | 'moderate' | 'premium' | 'luxury';
  rating: number | null;
  phone: string | null;
  website: string | null;
  photo_urls: string[];
  foursquare_url: string | null;
}

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  categories: Array<{ id: number; name: string }>;
  location: {
    address?: string;
    formatted_address?: string;
    locality?: string;
    region?: string;
    country?: string;
    cross_street?: string;
  };
  geocodes?: {
    main?: { latitude: number; longitude: number };
  };
  price?: number; // 1-4
  rating?: number;
  tel?: string;
  website?: string;
  link?: string;
}

interface FoursquarePhoto {
  id: string;
  prefix: string;
  suffix: string;
  width: number;
  height: number;
}

export interface SearchVendorsParams {
  lat: number;
  lng: number;
  services: string[];
  budget: number;
  guestCount: number;
}

// ─── Category Map ─────────────────────────────

/**
 * Maps service types to Foursquare category IDs.
 * Services not in this map use keyword-based search instead.
 */
const CATEGORY_MAP: Record<string, string> = {
  venue: '13003',
  catering: '13065',
  florist: '19024',
  cake: '13040',
};

/** Services that rely on keyword search instead of category IDs */
const KEYWORD_SERVICES: Record<string, string> = {
  dj: 'DJ musica eventi',
  photographer: 'fotografo eventi matrimonio',
  videographer: 'videografo eventi',
  live_music: 'musica dal vivo band eventi',
  mc: 'presentatore eventi cerimonie',
  lighting: 'illuminazione eventi allestimenti',
  transport: 'noleggio auto limousine eventi',
  band: 'band musica eventi matrimonio',
  decorator: 'allestimenti decorazioni eventi',
  rental: 'noleggio attrezzature eventi',
  planner: 'event planner organizzazione eventi',
  photography: 'fotografo eventi matrimonio',
  videography: 'videografo eventi',
};

const FSQ_BASE = 'https://api.foursquare.com/v3';
const CACHE_TTL = 60 * 60 * 24; // 24 hours

// ─── Helpers ──────────────────────────────────

export function mapPriceLevel(budget: number, guestCount: number): number {
  const perPerson = guestCount > 0 ? budget / guestCount : budget;
  if (perPerson < 50) return 1;
  if (perPerson < 100) return 2;
  if (perPerson < 200) return 3;
  return 4;
}

function priceLevelToRange(level: number): VendorResult['price_range'] {
  switch (level) {
    case 1:
      return 'budget';
    case 2:
      return 'moderate';
    case 3:
      return 'premium';
    default:
      return 'luxury';
  }
}

function buildPhotoUrl(photo: FoursquarePhoto, size = '400x300'): string {
  return `${photo.prefix}${size}${photo.suffix}`;
}

// ─── API calls ────────────────────────────────

async function fsqFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${FSQ_BASE}${path}`);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: env.FOURSQUARE_API_KEY,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Foursquare API error ${response.status}: ${response.statusText} — ${body}`,
    );
  }

  return response.json() as Promise<T>;
}

async function searchPlaces(
  lat: number,
  lng: number,
  service: string,
  maxPrice: number,
): Promise<FoursquarePlace[]> {
  const params: Record<string, string> = {
    ll: `${lat},${lng}`,
    radius: '25000',
    limit: '8',
    sort: 'RELEVANCE',
  };

  const categoryId = CATEGORY_MAP[service];
  if (categoryId) {
    params.categories = categoryId;
  }

  // Always add a keyword for better results
  const keyword = KEYWORD_SERVICES[service];
  if (keyword) {
    params.query = keyword;
  } else if (!categoryId) {
    // Unknown service — fall back to generic keyword
    params.query = `${service} eventi`;
  }

  const data = await fsqFetch<{ results: FoursquarePlace[] }>(
    '/places/search',
    params,
  );

  // Filter by price level if the place has price info
  return data.results.filter(
    (place) => !place.price || place.price <= maxPrice,
  );
}

async function getPhotos(fsqId: string): Promise<string[]> {
  try {
    const photos = await fsqFetch<FoursquarePhoto[]>(
      `/places/${fsqId}/photos`,
      { limit: '3' },
    );
    return photos.map((p) => buildPhotoUrl(p));
  } catch {
    // Photos are non-critical — return empty on error
    return [];
  }
}

// ─── Main search ──────────────────────────────

export async function searchVendors(
  params: SearchVendorsParams,
): Promise<VendorResult[]> {
  const { lat, lng, services, budget, guestCount } = params;
  const maxPrice = mapPriceLevel(budget, guestCount);
  const allVendors: VendorResult[] = [];

  // Search all services in parallel
  const serviceResults = await Promise.allSettled(
    services.map(async (service) => {
      // Check cache
      const cityKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      const cacheKey = `fsq:${cityKey}:${service}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as VendorResult[];
      }

      const places = await searchPlaces(lat, lng, service, maxPrice);

      // Get photos for top results (limit concurrency)
      const topPlaces = places.slice(0, 5);
      const photoResults = await Promise.allSettled(
        topPlaces.map((p) => getPhotos(p.fsq_id)),
      );

      const vendors: VendorResult[] = topPlaces.map((place, i) => {
        const photos =
          photoResults[i].status === 'fulfilled'
            ? photoResults[i].value
            : [];

        return {
          foursquare_id: place.fsq_id,
          name: place.name,
          category: place.categories?.[0]?.name ?? service,
          vendor_type: service,
          address:
            place.location?.formatted_address ??
            place.location?.address ??
            '',
          city: place.location?.locality ?? '',
          lat: place.geocodes?.main?.latitude ?? lat,
          lng: place.geocodes?.main?.longitude ?? lng,
          price_range: place.price
            ? priceLevelToRange(place.price)
            : priceLevelToRange(Math.min(maxPrice, 2)),
          rating: place.rating ?? null,
          phone: place.tel ?? null,
          website: place.website ?? null,
          photo_urls: photos,
          foursquare_url: place.link ?? null,
        };
      });

      // Cache the results
      await redis.set(cacheKey, JSON.stringify(vendors), 'EX', CACHE_TTL);

      return vendors;
    }),
  );

  for (const result of serviceResults) {
    if (result.status === 'fulfilled' && result.value) {
      allVendors.push(...result.value);
    } else if (result.status === 'rejected') {
      console.error('[Foursquare] Service search failed:', result.reason);
    }
  }

  return allVendors;
}

export default { searchVendors, mapPriceLevel };
