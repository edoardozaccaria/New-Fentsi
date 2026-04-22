# Deals Aggregators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich each Fentsi event plan with 3 actionable booking links per relevant category (accommodation, venues, catering, florists, event planners, decor) using Booking.com, Amazon.com, and Google Maps affiliate/search URLs.

**Architecture:** A pure `buildDealLinks()` utility computes all URLs server-side from the event row at render time — no DB schema changes, no AI output changes. A new `DealsCard` component renders links at the bottom of each relevant plan section. The link-generation layer is designed to be swapped for Fentsi partner DB queries post-MVP without touching any other layer.

**Tech Stack:** TypeScript, React (server component plan page), Vitest + React Testing Library, Tailwind/inline styles (matching existing dark design system).

> **Note on design spec:** Sections 3 (prompt injection) and 4 (plan_data schema changes) from the design spec are deferred — computing deals at render time from the event row is simpler, more reliable, and delivers identical UX. Prompt injection can be added as a v2 quality enhancement.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/deals.types.ts` | Create | `LinkOption`, `DealLinks`, `DealLinksInput` types |
| `src/lib/deals/categoryMap.ts` | Create | Event type → relevant categories lookup |
| `src/lib/deals/urlBuilders.ts` | Create | URL construction per aggregator (Booking, Amazon, Google Maps) |
| `src/lib/deals/index.ts` | Create | `buildDealLinks()` orchestrator |
| `src/lib/deals/__tests__/categoryMap.test.ts` | Create | Unit tests for category map |
| `src/lib/deals/__tests__/urlBuilders.test.ts` | Create | Unit tests for URL builders |
| `src/lib/deals/__tests__/buildDealLinks.test.ts` | Create | Unit tests for orchestrator |
| `src/components/event-plan/DealsCard.tsx` | Create | CTA card component |
| `src/components/event-plan/__tests__/DealsCard.test.tsx` | Create | Component tests |
| `src/app/event-plan/[id]/page.tsx` | Modify | Add `DealsCard` to Venue, Logistics, Catering, dynamic sections |
| `.env.example` | Modify | Add `BOOKING_AFFILIATE_ID`, `AMAZON_ASSOCIATES_TAG` |

---

## Task 1: Deal Types

**Files:**
- Create: `src/types/deals.types.ts`

- [ ] **Step 1: Create the types file**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/deals.types.ts
git commit -m "feat(deals): add DealLinks types"
```

---

## Task 2: Category Map

**Files:**
- Create: `src/lib/deals/categoryMap.ts`
- Create: `src/lib/deals/__tests__/categoryMap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/deals/__tests__/categoryMap.test.ts
import { describe, it, expect } from 'vitest';
import { getRelevantCategories } from '../categoryMap';

describe('getRelevantCategories', () => {
  it('returns all 6 categories for wedding', () => {
    const cats = getRelevantCategories('wedding');
    expect(cats).toContain('accommodation');
    expect(cats).toContain('venues');
    expect(cats).toContain('catering');
    expect(cats).toContain('florists');
    expect(cats).toContain('eventPlanners');
    expect(cats).toContain('decor');
    expect(cats).toHaveLength(6);
  });

  it('excludes accommodation for birthday', () => {
    const cats = getRelevantCategories('birthday');
    expect(cats).not.toContain('accommodation');
    expect(cats).not.toContain('florists');
    expect(cats).not.toContain('eventPlanners');
  });

  it('excludes florists for corporate', () => {
    const cats = getRelevantCategories('corporate');
    expect(cats).not.toContain('florists');
  });

  it('returns venues + catering + decor for unknown eventType', () => {
    const cats = getRelevantCategories('unknown_type');
    expect(cats).toContain('venues');
    expect(cats).toContain('catering');
    expect(cats).toContain('decor');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/deals/__tests__/categoryMap.test.ts
```
Expected: FAIL — `Cannot find module '../categoryMap'`

- [ ] **Step 3: Create the category map**

```ts
// src/lib/deals/categoryMap.ts
import type { DealCategory } from '@/types/deals.types';

const CATEGORY_MAP: Record<string, DealCategory[]> = {
  wedding: ['accommodation', 'venues', 'catering', 'florists', 'eventPlanners', 'decor'],
  anniversary: ['accommodation', 'venues', 'catering', 'florists', 'decor'],
  corporate: ['accommodation', 'venues', 'catering', 'eventPlanners', 'decor'],
  conference: ['accommodation', 'venues', 'catering', 'eventPlanners'],
  birthday: ['venues', 'catering', 'decor'],
  social_gathering: ['venues', 'catering', 'florists', 'decor'],
  other: ['venues', 'catering', 'decor'],
};

const DEFAULT_CATEGORIES: DealCategory[] = ['venues', 'catering', 'decor'];

export function getRelevantCategories(eventType: string): DealCategory[] {
  return CATEGORY_MAP[eventType] ?? DEFAULT_CATEGORIES;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/deals/__tests__/categoryMap.test.ts
```
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/deals/categoryMap.ts src/lib/deals/__tests__/categoryMap.test.ts
git commit -m "feat(deals): add category relevance map"
```

---

## Task 3: URL Builders

**Files:**
- Create: `src/lib/deals/urlBuilders.ts`
- Create: `src/lib/deals/__tests__/urlBuilders.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/deals/__tests__/urlBuilders.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildBookingAccommodationLinks,
  buildBookingVenueLinks,
  buildGoogleMapsLinks,
  buildAmazonDecorLinks,
} from '../urlBuilders';

describe('buildBookingAccommodationLinks', () => {
  it('returns 3 links with booking source', () => {
    const links = buildBookingAccommodationLinks({
      location: 'New York',
      guestCount: 50,
      checkIn: '2026-09-14',
      checkOut: '2026-09-15',
      budget: 20000,
      affiliateId: 'test123',
    });
    expect(links).toHaveLength(3);
    links.forEach((l) => expect(l.source).toBe('booking'));
  });

  it('includes affiliate id in all URLs', () => {
    const links = buildBookingAccommodationLinks({
      location: 'Austin',
      guestCount: 20,
      checkIn: '2026-06-01',
      checkOut: '2026-06-02',
      budget: 10000,
      affiliateId: 'myaid',
    });
    links.forEach((l) => expect(l.url).toContain('aid=myaid'));
  });

  it('omits aid param when affiliateId is empty', () => {
    const links = buildBookingAccommodationLinks({
      location: 'Austin',
      guestCount: 10,
      checkIn: '2026-06-01',
      checkOut: '2026-06-02',
      budget: 5000,
      affiliateId: '',
    });
    links.forEach((l) => expect(l.url).not.toContain('aid='));
  });
});

describe('buildBookingVenueLinks', () => {
  it('returns 3 booking venue links for the given location', () => {
    const links = buildBookingVenueLinks({ location: 'Miami', affiliateId: 'x' });
    expect(links).toHaveLength(3);
    links.forEach((l) => {
      expect(l.source).toBe('booking');
      expect(l.url).toContain('booking.com');
    });
  });
});

describe('buildGoogleMapsLinks', () => {
  it('returns 3 google_maps links for catering', () => {
    const links = buildGoogleMapsLinks({ location: 'Chicago', category: 'catering' });
    expect(links).toHaveLength(3);
    links.forEach((l) => expect(l.source).toBe('google_maps'));
  });

  it('returns 3 google_maps links for florists', () => {
    const links = buildGoogleMapsLinks({ location: 'Portland', category: 'florists' });
    expect(links).toHaveLength(3);
  });

  it('returns 3 google_maps links for eventPlanners', () => {
    const links = buildGoogleMapsLinks({ location: 'Seattle', category: 'eventPlanners' });
    expect(links).toHaveLength(3);
  });
});

describe('buildAmazonDecorLinks', () => {
  it('returns 3 amazon links with tag', () => {
    const links = buildAmazonDecorLinks({
      style: 'rustic',
      eventType: 'wedding',
      budget: 15000,
      associatesTag: 'fentsi-20',
    });
    expect(links).toHaveLength(3);
    links.forEach((l) => {
      expect(l.source).toBe('amazon');
      expect(l.url).toContain('amazon.com');
      expect(l.url).toContain('tag=fentsi-20');
    });
  });

  it('omits tag param when associatesTag is empty', () => {
    const links = buildAmazonDecorLinks({
      style: 'modern',
      eventType: 'corporate',
      budget: 8000,
      associatesTag: '',
    });
    links.forEach((l) => expect(l.url).not.toContain('tag='));
  });

  it('uses style and eventType in search keywords', () => {
    const links = buildAmazonDecorLinks({
      style: 'bohemian',
      eventType: 'birthday',
      budget: 3000,
      associatesTag: '',
    });
    expect(links[0]!.url).toContain('bohemian');
    expect(links[0]!.url).toContain('birthday');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/deals/__tests__/urlBuilders.test.ts
```
Expected: FAIL — `Cannot find module '../urlBuilders'`

- [ ] **Step 3: Implement URL builders**

```ts
// src/lib/deals/urlBuilders.ts
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

export function buildBookingAccommodationLinks(input: BookingAccomInput): LinkOption[] {
  const { location, guestCount, checkIn, checkOut, budget, affiliateId } = input;
  const nights = 1;
  const nightlyTarget = Math.round((budget * 0.15) / Math.max(guestCount / 2, 1) / nights);

  const base = new URL('https://www.booking.com/searchresults.html');
  base.searchParams.set('ss', location);
  base.searchParams.set('checkin', checkIn);
  base.searchParams.set('checkout', checkOut);
  base.searchParams.set('group_adults', String(Math.min(guestCount, 30)));
  if (affiliateId) base.searchParams.set('aid', affiliateId);

  const valueUrl = new URL(base.toString());
  valueUrl.searchParams.set('nflt', `price%3D0-${Math.round(nightlyTarget * 0.7)}`);

  const premiumUrl = new URL(base.toString());
  premiumUrl.searchParams.set('nflt', `price%3D${Math.round(nightlyTarget * 1.3)}-9999`);

  return [
    { label: `Value accommodation in ${location}`, url: valueUrl.toString(), source: 'booking' },
    { label: `Best match for your budget in ${location}`, url: base.toString(), source: 'booking' },
    { label: `Premium accommodation in ${location}`, url: premiumUrl.toString(), source: 'booking' },
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
    { label: `Boutique event spaces in ${location}`, url: makeUrl('boutique event spaces'), source: 'booking' },
    { label: `Hotel ballrooms in ${location}`, url: makeUrl('hotel ballrooms'), source: 'booking' },
    { label: `Wedding venues in ${location}`, url: makeUrl('wedding venues'), source: 'booking' },
  ];
}

// ── Google Maps ───────────────────────────────────────────────────────────────

const GOOGLE_MAPS_QUERIES: Record<string, Array<{ label: string; query: string }>> = {
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
  const templates = GOOGLE_MAPS_QUERIES[input.category] ?? GOOGLE_MAPS_QUERIES['catering']!;
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
    if (priceFilter === 'low') u.searchParams.set('high-price', String(Math.round(decorBudget * 0.5)));
    if (priceFilter === 'high') u.searchParams.set('low-price', String(Math.round(decorBudget * 1.2)));
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/deals/__tests__/urlBuilders.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/deals/urlBuilders.ts src/lib/deals/__tests__/urlBuilders.test.ts
git commit -m "feat(deals): add URL builders for Booking, Amazon, Google Maps"
```

---

## Task 4: `buildDealLinks()` Orchestrator

**Files:**
- Create: `src/lib/deals/index.ts`
- Create: `src/lib/deals/__tests__/buildDealLinks.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/deals/__tests__/buildDealLinks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDealLinks } from '../index';

const BASE_INPUT = {
  location: 'Austin, TX',
  eventType: 'wedding',
  guestCount: 80,
  eventDate: '2026-09-15',
  style: 'rustic',
  budget: 30000,
};

describe('buildDealLinks', () => {
  beforeEach(() => {
    vi.stubEnv('BOOKING_AFFILIATE_ID', 'test-booking-id');
    vi.stubEnv('AMAZON_ASSOCIATES_TAG', 'test-tag-20');
  });

  it('returns all 6 categories for wedding', () => {
    const result = buildDealLinks(BASE_INPUT);
    expect(result.accommodation).toHaveLength(3);
    expect(result.venues).toHaveLength(3);
    expect(result.catering).toHaveLength(3);
    expect(result.florists).toHaveLength(3);
    expect(result.eventPlanners).toHaveLength(3);
    expect(result.decor).toHaveLength(3);
  });

  it('returns only relevant categories for birthday', () => {
    const result = buildDealLinks({ ...BASE_INPUT, eventType: 'birthday' });
    expect(result.accommodation).toBeUndefined();
    expect(result.florists).toBeUndefined();
    expect(result.eventPlanners).toBeUndefined();
    expect(result.venues).toHaveLength(3);
    expect(result.catering).toHaveLength(3);
    expect(result.decor).toHaveLength(3);
  });

  it('returns venues + catering + decor for unknown event type', () => {
    const result = buildDealLinks({ ...BASE_INPUT, eventType: 'unknown_xyz' });
    expect(result.venues).toHaveLength(3);
    expect(result.catering).toHaveLength(3);
    expect(result.decor).toHaveLength(3);
    expect(result.accommodation).toBeUndefined();
  });

  it('skips accommodation when eventDate is null', () => {
    const result = buildDealLinks({ ...BASE_INPUT, eventDate: null });
    expect(result.accommodation).toBeUndefined();
  });

  it('includes affiliate id in booking URLs', () => {
    const result = buildDealLinks(BASE_INPUT);
    result.accommodation!.forEach((l) => expect(l.url).toContain('aid=test-booking-id'));
  });

  it('includes associates tag in amazon URLs', () => {
    const result = buildDealLinks(BASE_INPUT);
    result.decor!.forEach((l) => expect(l.url).toContain('tag=test-tag-20'));
  });

  it('uses style in amazon decor keywords', () => {
    const result = buildDealLinks({ ...BASE_INPUT, style: 'bohemian' });
    result.decor!.forEach((l) => expect(l.url).toContain('bohemian'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/deals/__tests__/buildDealLinks.test.ts
```
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: Implement the orchestrator**

```ts
// src/lib/deals/index.ts
import type { DealLinks, DealLinksInput } from '@/types/deals.types';
import { getRelevantCategories } from './categoryMap';
import {
  buildBookingAccommodationLinks,
  buildBookingVenueLinks,
  buildGoogleMapsLinks,
  buildAmazonDecorLinks,
} from './urlBuilders';

function deriveCheckInOut(eventDate: string): { checkIn: string; checkOut: string } {
  const d = new Date(eventDate + 'T00:00:00');
  const checkIn = new Date(d);
  checkIn.setDate(d.getDate() - 1);
  const checkOut = new Date(d);
  checkOut.setDate(d.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().split('T')[0]!,
    checkOut: checkOut.toISOString().split('T')[0]!,
  };
}

export function buildDealLinks(input: DealLinksInput): Partial<DealLinks> {
  const bookingId = process.env.BOOKING_AFFILIATE_ID ?? '';
  const amazonTag = process.env.AMAZON_ASSOCIATES_TAG ?? '';
  const categories = getRelevantCategories(input.eventType);
  const result: Partial<DealLinks> = {};

  for (const category of categories) {
    switch (category) {
      case 'accommodation': {
        if (!input.eventDate) break;
        const { checkIn, checkOut } = deriveCheckInOut(input.eventDate);
        result.accommodation = buildBookingAccommodationLinks({
          location: input.location,
          guestCount: input.guestCount,
          checkIn,
          checkOut,
          budget: input.budget,
          affiliateId: bookingId,
        });
        break;
      }
      case 'venues':
        result.venues = buildBookingVenueLinks({
          location: input.location,
          affiliateId: bookingId,
        });
        break;
      case 'catering':
        result.catering = buildGoogleMapsLinks({ location: input.location, category: 'catering' });
        break;
      case 'florists':
        result.florists = buildGoogleMapsLinks({ location: input.location, category: 'florists' });
        break;
      case 'eventPlanners':
        result.eventPlanners = buildGoogleMapsLinks({ location: input.location, category: 'eventPlanners' });
        break;
      case 'decor':
        result.decor = buildAmazonDecorLinks({
          style: input.style,
          eventType: input.eventType,
          budget: input.budget,
          associatesTag: amazonTag,
        });
        break;
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/deals/__tests__/buildDealLinks.test.ts
```
Expected: PASS — all tests

- [ ] **Step 5: Run all deals tests together**

```bash
npx vitest run src/lib/deals
```
Expected: PASS — all tests across all deals test files

- [ ] **Step 6: Commit**

```bash
git add src/lib/deals/index.ts src/lib/deals/__tests__/buildDealLinks.test.ts
git commit -m "feat(deals): add buildDealLinks orchestrator"
```

---

## Task 5: DealsCard Component

**Files:**
- Create: `src/components/event-plan/DealsCard.tsx`
- Create: `src/components/event-plan/__tests__/DealsCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/event-plan/__tests__/DealsCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DealsCard } from '../DealsCard';
import type { LinkOption } from '@/types/deals.types';

const BOOKING_LINKS: LinkOption[] = [
  { label: 'Value accommodation in Austin', url: 'https://booking.com/a', source: 'booking' },
  { label: 'Best match in Austin', url: 'https://booking.com/b', source: 'booking' },
  { label: 'Premium in Austin', url: 'https://booking.com/c', source: 'booking' },
];

const GOOGLE_LINKS: LinkOption[] = [
  { label: 'Catering services near Austin', url: 'https://maps.google.com/1', source: 'google_maps' },
  { label: 'Private chef near Austin', url: 'https://maps.google.com/2', source: 'google_maps' },
  { label: 'Food trucks near Austin', url: 'https://maps.google.com/3', source: 'google_maps' },
];

describe('DealsCard', () => {
  it('renders title and all link labels', () => {
    render(<DealsCard title="Find Accommodation" deals={BOOKING_LINKS} />);
    expect(screen.getByText('Find Accommodation')).toBeInTheDocument();
    expect(screen.getByText('Value accommodation in Austin')).toBeInTheDocument();
    expect(screen.getByText('Best match in Austin')).toBeInTheDocument();
    expect(screen.getByText('Premium in Austin')).toBeInTheDocument();
  });

  it('shows affiliate disclosure for booking links', () => {
    render(<DealsCard title="Accommodation" deals={BOOKING_LINKS} />);
    expect(screen.getByText(/affiliate link/i)).toBeInTheDocument();
  });

  it('does not show affiliate disclosure for google_maps links', () => {
    render(<DealsCard title="Catering" deals={GOOGLE_LINKS} />);
    expect(screen.queryByText(/affiliate link/i)).not.toBeInTheDocument();
  });

  it('renders links with target="_blank"', () => {
    render(<DealsCard title="Catering" deals={GOOGLE_LINKS} />);
    const links = screen.getAllByRole('link');
    links.forEach((l) => expect(l).toHaveAttribute('target', '_blank'));
  });

  it('renders nothing when deals array is empty', () => {
    const { container } = render(<DealsCard title="Accommodation" deals={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/event-plan/__tests__/DealsCard.test.tsx
```
Expected: FAIL — `Cannot find module '../DealsCard'`

- [ ] **Step 3: Implement DealsCard**

```tsx
// src/components/event-plan/DealsCard.tsx
import type { LinkOption, DealSource } from '@/types/deals.types';

const SOURCE_BADGE: Record<DealSource, { label: string; color: string; bg: string; border: string }> = {
  booking: { label: 'Booking.com', color: '#60a5fa', bg: '#0a1628', border: '#1e3a5f' },
  amazon: { label: 'Amazon', color: '#fb923c', bg: '#1a0f05', border: '#5a2f10' },
  google_maps: { label: 'Google Maps', color: '#4ade80', bg: '#061a0e', border: '#145a2a' },
};

interface DealsCardProps {
  title: string;
  deals: LinkOption[];
}

export function DealsCard({ title, deals }: DealsCardProps) {
  if (deals.length === 0) return null;

  const hasAffiliate = deals.some((d) => d.source === 'booking' || d.source === 'amazon');

  return (
    <div
      className="rounded-lg border p-5 space-y-3 mt-4"
      style={{ background: '#0e0d0b', borderColor: '#2a2520' }}
    >
      <p className="text-xs tracking-widest uppercase" style={{ color: '#6b6258' }}>
        {title}
      </p>

      <ul className="space-y-2">
        {deals.map((link, i) => {
          const badge = SOURCE_BADGE[link.source];
          return (
            <li key={i} className="flex items-center justify-between gap-3">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-relaxed hover:underline"
                style={{ color: '#c9975b' }}
              >
                {link.label}
              </a>
              <span
                className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}
              >
                {badge.label}
              </span>
            </li>
          );
        })}
      </ul>

      {hasAffiliate && (
        <p className="text-xs" style={{ color: '#4a4540' }}>
          🔗 Affiliate link — Fentsi may earn a commission at no extra cost to you.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/event-plan/__tests__/DealsCard.test.tsx
```
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/event-plan/DealsCard.tsx src/components/event-plan/__tests__/DealsCard.test.tsx
git commit -m "feat(deals): add DealsCard component"
```

---

## Task 6: Wire DealsCard into Plan Page

**Files:**
- Modify: `src/app/event-plan/[id]/page.tsx`

- [ ] **Step 1: Update EventRow interface to include style_preferences**

In `src/app/event-plan/[id]/page.tsx`, update the `EventRow` interface (around line 27) and the Supabase query (around line 385):

```ts
// Update EventRow interface — add after output_language field:
interface EventRow {
  id: string;
  event_type: string;
  event_date: string | null;
  duration: string | null;
  guest_count: number;
  city: string;
  budget_usd: number;
  required_services: string[];
  output_language: string | null;
  style_preferences: string[];   // ADD THIS
  plan_data: PlanOverview | null;
}
```

- [ ] **Step 2: Add imports and compute dealLinks in the page**

At the top of `src/app/event-plan/[id]/page.tsx`, add these imports after the existing ones:

```ts
import { DealsCard } from '@/components/event-plan/DealsCard';
import { buildDealLinks } from '@/lib/deals';
```

In the Supabase query (around line 385), add `style_preferences` to the select:

```ts
supabase.from('events').select('*, style_preferences').eq('id', id).single(),
```

After `const plan = ev.plan_data;` (around line 399), compute dealLinks:

```ts
const dealLinks = buildDealLinks({
  location: ev.city,
  eventType: ev.event_type,
  guestCount: ev.guest_count,
  eventDate: ev.event_date,
  style: ev.style_preferences[0] ?? 'classic',
  budget: ev.budget_usd,
});
```

- [ ] **Step 3: Add DealsCard to Venue section**

In the VenueSection block (after the venueSuppliers grid, around line 508), add:

```tsx
{dealLinks.venues && (
  <DealsCard title="Browse More Venues" deals={dealLinks.venues} />
)}
```

- [ ] **Step 4: Add DealsCard to Logistics section**

In the Logistics section, after the accommodation list block (around line 718), add:

```tsx
{dealLinks.accommodation && (
  <DealsCard title="Book Accommodation" deals={dealLinks.accommodation} />
)}
```

- [ ] **Step 5: Add DealsCard to Catering section**

After the catering card closing `</div>` (around line 639), add:

```tsx
{dealLinks.catering && (
  <DealsCard title="Find Caterers" deals={dealLinks.catering} />
)}
```

- [ ] **Step 6: Add DealsCard to dynamic supplier sections**

In the `Object.entries(grouped).map(...)` block, after each supplier grid, add:

```tsx
{Object.entries(grouped).map(([category, catSuppliers]) => (
  <section key={category} className="space-y-4">
    {/* existing heading and grid ... */}

    {/* ADD: deals for florists and eventPlanners */}
    {category === 'flowers' || category === 'florist' || category === 'florists' ? (
      dealLinks.florists && <DealsCard title="Browse Florists" deals={dealLinks.florists} />
    ) : category === 'planner' || category === 'event_planner' || category === 'planners' ? (
      dealLinks.eventPlanners && <DealsCard title="Browse Event Planners" deals={dealLinks.eventPlanners} />
    ) : null}
  </section>
))}
```

Also add decor card after the entire grouped sections block, unconditionally if `dealLinks.decor` exists:

```tsx
{dealLinks.decor && (
  <section className="space-y-4">
    <SectionHeading>Decor & Supplies</SectionHeading>
    <DealsCard title="Shop Decor on Amazon" deals={dealLinks.decor} />
  </section>
)}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```
Expected: PASS — all existing tests plus new deals tests

- [ ] **Step 8: Commit**

```bash
git add src/app/event-plan/[id]/page.tsx
git commit -m "feat(deals): wire DealsCard into plan page sections"
```

---

## Task 7: Environment Variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add env vars to .env.example**

Open `.env.example` and add at the end:

```bash
# Deals aggregators — affiliate programs
# Sign up at: https://www.booking.com/affiliate-program/
BOOKING_AFFILIATE_ID=

# Sign up at: https://affiliate-program.amazon.com/
AMAZON_ASSOCIATES_TAG=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add affiliate env vars to .env.example"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: PASS — all tests

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Start dev server and verify plan page**

```bash
npm run dev
```

Open an existing plan page at `http://localhost:3000/event-plan/<any-id>`. Verify:
- DealsCard renders in the Venue section
- DealsCard renders in the Logistics section (if event has a date)
- DealsCard renders in the Catering section
- Affiliate disclosure shows for Booking/Amazon cards
- No disclosure shows for Google Maps cards
- All links open in a new tab

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(deals): complete deals aggregators integration"
```
