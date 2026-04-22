# Deals Aggregators — Design Spec

**Date:** 2026-04-22  
**Status:** Approved  
**Market:** US (English only)

---

## Problem

The Fentsi AI plan suggests vendor categories (venue, catering, florists, decor, etc.) but does not link users to where they can actually book or purchase. This spec closes that gap for MVP using affiliate URL injection — no direct partnerships, no API approvals, revenue from day 1.

**Long-term vision:** Google Maps links and affiliate URLs are placeholders. Post-MVP, these will be replaced by Fentsi partner professionals who register on the platform and are stored in the DB. The architecture is designed to make this swap transparent to all other layers.

---

## Approach: Affiliate URL Injection

Three approaches were evaluated:

| | Approach | Verdict |
|---|---|---|
| A | Affiliate URL injection (chosen) | Zero approval, instant signup, revenue day 1 |
| B | Real APIs (Booking PAAPI + Amazon PAAPI) | Blocked by Amazon PAAPI 3-sale requirement — not viable for MVP with no traffic |
| C | Static curated links | No personalization, stale quickly |

**Chosen: Approach A.** Claude writes contextual descriptions around the links — better than an API dump and consistent with Fentsi's "AI personal planner" tone.

**Aggregators:**
- **Booking.com** — accommodation + venue (affiliate program, free signup → `BOOKING_AFFILIATE_ID`)
- **Amazon.com** — decor (Associates program, free signup → `AMAZON_ASSOCIATES_TAG`)
- **Google Maps** — catering, florists, event planners (no affiliate, but useful links)

---

## Section 1 — Architecture

Three distinct layers:

### Layer 1 — Link Generation (`src/lib/deals/`)

`buildDealLinks(input: DealLinksInput): Partial<DealLinks>`

Receives wizard payload fields, returns only the categories relevant to the event type. This is the **swappable layer**: today builds static URLs, post-MVP queries the Fentsi partner DB. No other layer knows the implementation.

### Layer 2 — Prompt Injection (`src/lib/ai.ts`)

`buildPrompt()` receives `Partial<DealLinks>` as an additional parameter and injects a structured `PARTNER LINKS` block into the system prompt. Claude cites the links in the relevant plan sections with contextual descriptions.

### Layer 3 — UI Rendering (`src/components/event-plan/DealsCard.tsx`)

Reads `deals?: LinkOption[]` from each `plan_data` section and renders a "Find & Book" card at the bottom of the section. If `deals` is absent, nothing renders.

**No DB migration required** — `plan_data` is already JSONB; new fields are optional.

---

## Section 2 — `buildDealLinks()` Interface

### Input

```ts
type DealLinksInput = {
  location: string        // "New York, NY"
  eventType: EventType
  guestCount: number
  checkIn: string         // ISO date — day before event
  checkOut: string        // ISO date — day after event
  style: string           // drives Amazon decor keywords
  budget: number          // total event budget in USD
}
```

### Output

```ts
type LinkOption = {
  label: string
  url: string
  source: "booking" | "amazon" | "google_maps"
}

type DealLinks = {
  accommodation: LinkOption[]
  venues: LinkOption[]
  catering: LinkOption[]
  florists: LinkOption[]
  eventPlanners: LinkOption[]
  decor: LinkOption[]
}

// buildDealLinks returns Partial<DealLinks> — only relevant categories
```

### URL Construction

**Booking.com accommodation** — 3 price variants derived from budget:
- Estimated nightly rate = `(budget * 0.15) / guestCount / nights`
- Variant A (value): `-30%` of target → `price_filter_max={target*0.7}`
- Variant B (target): no price filter
- Variant C (premium): `+30%` of target → `price_filter_min={target*1.3}`
- Base: `booking.com/search?ss={location}&checkin={checkIn}&checkout={checkOut}&group_adults={guestCount}&aid={BOOKING_AFFILIATE_ID}`

**Booking.com venues** — 3 search variants:
- `"boutique event spaces {location}"`
- `"hotel ballrooms {location}"`
- `"wedding venues {location}"` (adjusted per event type)

**Google Maps catering** — 3 type variants:
- `"catering services near {location}"`
- `"private chef near {location}"`
- `"food trucks near {location}"`

**Google Maps florists** — 3 type variants:
- `"wedding florists near {location}"`
- `"event florists near {location}"`
- `"floral designers near {location}"`

**Google Maps event planners** — 3 type variants:
- `"event planners near {location}"`
- `"wedding planners near {location}"`
- `"party planners near {location}"`

**Amazon.com decor** — 3 keyword variants driven by `style` + `eventType`:
- Variant A (value): `"{style} {eventType} decorations"` + `low-price` param
- Variant B (target): `"{style} {eventType} party supplies table decor"`
- Variant C (premium): `"luxury {style} {eventType} centerpieces"` + `high-price` param
- All include `&tag={AMAZON_ASSOCIATES_TAG}`

### Category Relevance Map (`src/lib/deals/categoryMap.ts`)

| Event Type | Accommodation | Venues | Catering | Florists | Planners | Decor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| wedding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| anniversary | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| corporate | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| conference | ✓ | ✓ | ✓ | — | ✓ | — |
| birthday | — | ✓ | ✓ | — | — | ✓ |
| social_gathering | — | ✓ | ✓ | ✓ | — | ✓ |
| other | — | ✓ | ✓ | — | — | ✓ |

---

## Section 3 — Prompt Injection

`buildPrompt()` signature change:

```ts
function buildPrompt(
  wizardPayload: WizardPayload,
  dealLinks: Partial<DealLinks>,   // new parameter
  vendorData?: VendorData          // existing
): string
```

Injected block (appended after wizard context, before JSON output instructions):

```
--- PARTNER LINKS (use these in the plan) ---
For each category below, cite all options as markdown links in the relevant 
plan section. Write a short contextual sentence for each — do NOT paste bare 
URLs. Match the tone of a trusted personal planner.

ACCOMMODATION (§ Logistics):
- [Value picks for your budget](url_A)
- [Best match for your budget](url_B)
- [Premium options](url_C)

[...other categories present in dealLinks...]

Disclosure: add "🔗 Affiliate link" next to Booking.com and Amazon links.
Google Maps links need no disclosure.
--- END PARTNER LINKS ---
```

If `dealLinks` is empty (`{}`), the block is omitted entirely.

---

## Section 4 — `plan_data` Schema Changes

New optional field added to relevant sections in `plan_data` JSONB:

```ts
// Added to: logistics, venue, catering, floralDecor, vendors
deals?: LinkOption[]   // max 3 items
```

`floralDecor.deals` merges florists + decor into a single array (florists first, then Amazon decor links) — matches the existing §5 Floral & Decor section boundary.

`source` field on `LinkOption` drives disclosure logic in the UI.

---

## Section 5 — UI Rendering

**New component:** `src/components/event-plan/DealsCard.tsx`

Props: `{ title: string; deals: LinkOption[] }`

Visual structure:
- Section header with emoji icon per category
- 3 links with source badge (Booking.com = blue, Amazon = orange, Google Maps = green)
- Affiliate disclosure line — shown only when any `source` is `"booking"` or `"amazon"`
- Links: `target="_blank" rel="noopener noreferrer"`
- Renders nothing if `deals` is undefined or empty

**Placement:** bottom of each relevant plan section — after AI-generated content, before the next section. Visually separated by a subtle divider.

---

## Section 6 — Error Handling

- `buildDealLinks()` is pure (no network calls) — cannot throw at runtime
- Unknown `eventType` not in category map → returns `{}`, plan generates normally, `console.warn` logs the unmapped type
- Missing `BOOKING_AFFILIATE_ID` or `AMAZON_ASSOCIATES_TAG` env vars → links built without affiliate tag (valid URLs, no revenue tracking), no user-facing error
- All degradation is silent — the plan is never blocked by deals logic

---

## Section 7 — Testing

**Unit — `buildDealLinks()`**
- Given fixed `DealLinksInput`, assert correct categories returned per `eventType`
- Assert Booking.com URLs contain `aid` param and correct price range params
- Assert Amazon URLs contain `tag` param and correct `style`+`eventType` keywords
- Assert graceful degradation for unknown `eventType`

**Unit — `buildPrompt()`**
- With populated `DealLinks`: assert prompt contains `PARTNER LINKS` block with injected URLs
- With empty `{}`: assert `PARTNER LINKS` block is absent

**Integration — plan page**
- Section with `deals` array → `DealsCard` renders with correct links
- Section without `deals` → `DealsCard` not rendered

No E2E Booking/Amazon — links are statically constructed, no external mock needed.

---

## Environment Variables

```
BOOKING_AFFILIATE_ID=      # from Booking.com Affiliate Partner Program
AMAZON_ASSOCIATES_TAG=     # from Amazon Associates US
```

Add to `.env.example` and `.env.development`.

---

## Files Affected

| File | Change |
|---|---|
| `src/lib/deals/index.ts` | New — `buildDealLinks()` implementation |
| `src/lib/deals/categoryMap.ts` | New — event type → category relevance map |
| `src/lib/deals/urlBuilders.ts` | New — URL construction per aggregator |
| `src/types/plan.types.ts` | Add `LinkOption` type, add `deals?: LinkOption[]` to section types |
| `src/lib/ai.ts` | Update `buildPrompt()` signature + inject PARTNER LINKS block |
| `src/components/event-plan/DealsCard.tsx` | New — CTA card component |
| `src/app/event-plan/[id]/page.tsx` | Add `DealsCard` to relevant sections |
| `.env.example` | Add `BOOKING_AFFILIATE_ID`, `AMAZON_ASSOCIATES_TAG` |

---

## Related

[[Fentsi_Plan_Output_Specification]] · [[Fentsi_Tech_Architecture]] · [[Fentsi_MVP_Roadmap]] · [[Fentsi_Deals_Aggregators_Strategy]]
