import type { LinkOption } from '@/types/deals.types';

// ── Booking.com ──────────────────────────────────────────────────────────────

interface BookingAccomInput {
  location: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  budget: number;
  affiliateId: string;
}

export function buildBookingAccommodationLinks(
  input: BookingAccomInput
): LinkOption[] {
  const { location, guestCount, checkIn, checkOut, budget, affiliateId } =
    input;
  const nights = 1;
  const nightlyTarget = Math.round(
    (budget * 0.15) / Math.max(guestCount / 2, 1) / nights
  );

  const base = new URL('https://www.booking.com/searchresults.html');
  base.searchParams.set('ss', location);
  base.searchParams.set('checkin', checkIn);
  base.searchParams.set('checkout', checkOut);
  base.searchParams.set('group_adults', String(Math.min(guestCount, 30)));
  if (affiliateId) base.searchParams.set('aid', affiliateId);

  const valueUrl = new URL(base.toString());
  valueUrl.searchParams.set(
    'nflt',
    `price%3D0-${Math.round(nightlyTarget * 0.7)}`
  );

  const premiumUrl = new URL(base.toString());
  premiumUrl.searchParams.set(
    'nflt',
    `price%3D${Math.round(nightlyTarget * 1.3)}-9999`
  );

  return [
    {
      label: `Value accommodation in ${location}`,
      url: valueUrl.toString(),
      source: 'booking',
    },
    {
      label: `Best match for your budget in ${location}`,
      url: base.toString(),
      source: 'booking',
    },
    {
      label: `Premium accommodation in ${location}`,
      url: premiumUrl.toString(),
      source: 'booking',
    },
  ];
}

interface BookingVenueInput {
  location: string;
  affiliateId: string;
}

export function buildBookingVenueLinks(input: BookingVenueInput): LinkOption[] {
  const { location, affiliateId } = input;

  const makeUrl = (query: string) => {
    const u = new URL('https://www.booking.com/searchresults.html');
    u.searchParams.set('ss', `${query} ${location}`);
    if (affiliateId) u.searchParams.set('aid', affiliateId);
    return u.toString();
  };

  return [
    {
      label: `Boutique event spaces in ${location}`,
      url: makeUrl('boutique event spaces'),
      source: 'booking',
    },
    {
      label: `Hotel ballrooms in ${location}`,
      url: makeUrl('hotel ballrooms'),
      source: 'booking',
    },
    {
      label: `Wedding venues in ${location}`,
      url: makeUrl('wedding venues'),
      source: 'booking',
    },
  ];
}

// ── Google Maps ───────────────────────────────────────────────────────────────

const GOOGLE_MAPS_QUERIES: Record<
  string,
  Array<{ label: string; query: string }>
> = {
  catering: [
    { label: 'Catering services', query: 'catering services' },
    { label: 'Private chef hire', query: 'private chef hire' },
    { label: 'Food trucks', query: 'food trucks' },
  ],
  florists: [
    { label: 'Wedding florists', query: 'wedding florists' },
    { label: 'Event florists', query: 'event florists' },
    { label: 'Floral designers', query: 'floral designers' },
  ],
  eventPlanners: [
    { label: 'Event planners', query: 'event planners' },
    { label: 'Wedding planners', query: 'wedding planners' },
    { label: 'Party planners', query: 'party planners' },
  ],
};

interface GoogleMapsInput {
  location: string;
  category: 'catering' | 'florists' | 'eventPlanners';
}

export function buildGoogleMapsLinks(input: GoogleMapsInput): LinkOption[] {
  const templates =
    GOOGLE_MAPS_QUERIES[input.category] ?? GOOGLE_MAPS_QUERIES['catering']!;
  return templates.map(({ label, query }) => ({
    label: `${label} near ${input.location}`,
    url: `https://www.google.com/maps/search/${encodeURIComponent(`${query} near ${input.location}`)}`,
    source: 'google_maps' as const,
  }));
}

// ── Amazon ────────────────────────────────────────────────────────────────────

interface AmazonDecorInput {
  style: string;
  eventType: string;
  budget: number;
  associatesTag: string;
}

export function buildAmazonDecorLinks(input: AmazonDecorInput): LinkOption[] {
  const { style, eventType, budget, associatesTag } = input;
  const decorBudget = Math.round(budget * 0.08);

  const makeUrl = (keywords: string, priceFilter?: 'low' | 'high') => {
    const u = new URL('https://www.amazon.com/s');
    u.searchParams.set('k', keywords);
    if (associatesTag) u.searchParams.set('tag', associatesTag);
    if (priceFilter === 'low')
      u.searchParams.set('high-price', String(Math.round(decorBudget * 0.5)));
    if (priceFilter === 'high')
      u.searchParams.set('low-price', String(Math.round(decorBudget * 1.2)));
    return u.toString();
  };

  return [
    {
      label: `${style} ${eventType} decorations`,
      url: makeUrl(`${style} ${eventType} decorations`, 'low'),
      source: 'amazon',
    },
    {
      label: `${style} ${eventType} party supplies`,
      url: makeUrl(`${style} ${eventType} party supplies table decor`),
      source: 'amazon',
    },
    {
      label: `Luxury ${style} ${eventType} centerpieces`,
      url: makeUrl(`luxury ${style} ${eventType} centerpieces`, 'high'),
      source: 'amazon',
    },
  ];
}
