# Real Supplier Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Claude's fictional supplier generation with real businesses fetched from Foursquare (venues/caterers) and Tavily (photographers, DJs, planners, etc.) before the AI prompt is sent.

**Architecture:** Before calling Claude, the API route fetches real candidate businesses from Foursquare Places API (physical venues) and Tavily web search (service providers). These candidates are injected into the Claude prompt as context. Claude's job becomes curation + description, not invention — it picks the best 3 per category, adds "why it fits your event" reasoning, and estimates prices from the budget.

**Tech Stack:** Foursquare Places API v3, Tavily Search API, `@anthropic-ai/sdk` (already installed), Zod v4, Vitest

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/services/foursquare.ts` | Foursquare Places API client — search venues and caterers by city |
| Create | `src/services/tavily.ts` | Tavily Search API client — find service providers via web search |
| Create | `src/services/supplier-discovery.ts` | Orchestrator — maps service categories to the right API, returns `RealSupplierCandidate[]` per category |
| Create | `src/types/supplier-discovery.types.ts` | Shared types: `RealSupplierCandidate`, `DiscoveredSuppliers` |
| Modify | `src/lib/ai.ts` | Add `realSuppliers` optional param to `EventPlanInput`; update `buildPrompt()` to inject real candidates into prompt |
| Modify | `src/app/api/generate-suppliers/route.ts` | Add pre-fetch step: call `discoverSuppliers()` before calling Claude |
| Create | `src/services/foursquare.test.ts` | Unit tests for Foursquare client (mocked fetch) |
| Create | `src/services/tavily.test.ts` | Unit tests for Tavily client (mocked fetch) |
| Create | `src/services/supplier-discovery.test.ts` | Unit tests for orchestrator routing logic |

---

## Task 1: Shared types

**Files:**
- Create: `src/types/supplier-discovery.types.ts`

- [ ] **Step 1: Create the types file**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/supplier-discovery.types.ts
git commit -m "feat: add RealSupplierCandidate and DiscoveredSuppliers types"
```

---

## Task 2: Foursquare client + tests

**Files:**
- Create: `src/services/foursquare.ts`
- Create: `src/services/foursquare.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/foursquare.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchFoursquarePlaces } from './foursquare';

const MOCK_RESPONSE = {
  results: [
    {
      name: 'Villa Reale',
      location: { formatted_address: 'Via Roma 1, Milano' },
      rating: 8.5,
      website: 'https://villareale.it',
      fsq_id: 'abc123',
    },
    {
      name: 'Palazzo Borromeo',
      location: { formatted_address: 'Corso Venezia 5, Milano' },
      rating: 9.1,
      website: undefined,
      fsq_id: 'def456',
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_RESPONSE,
  } as Response);
});

describe('searchFoursquarePlaces', () => {
  it('returns mapped RealSupplierCandidate array', async () => {
    const results = await searchFoursquarePlaces('event venue', 'Milano', 'TEST_KEY');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      name: 'Villa Reale',
      address: 'Via Roma 1, Milano',
      rating: 8.5,
      website: 'https://villareale.it',
      snippet: undefined,
      source: 'foursquare',
    });
  });

  it('returns empty array when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 } as Response);
    const results = await searchFoursquarePlaces('venue', 'Roma', 'BAD_KEY');
    expect(results).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const results = await searchFoursquarePlaces('venue', 'Roma', 'TEST_KEY');
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/edoza/OneDrive/Desktop/New-Fentsi
npx vitest run src/services/foursquare.test.ts
```
Expected: FAIL — `searchFoursquarePlaces` not found

- [ ] **Step 3: Implement Foursquare client**

```ts
// src/services/foursquare.ts
import type { RealSupplierCandidate } from '@/types/supplier-discovery.types';

const BASE_URL = 'https://api.foursquare.com/v3/places/search';
const FIELDS = 'name,location,rating,website,fsq_id';

export async function searchFoursquarePlaces(
  query: string,
  city: string,
  apiKey: string,
  limit = 5,
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/services/foursquare.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/foursquare.ts src/services/foursquare.test.ts
git commit -m "feat: add Foursquare Places client with tests"
```

---

## Task 3: Tavily client + tests

**Files:**
- Create: `src/services/tavily.ts`
- Create: `src/services/tavily.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/tavily.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTavilySuppliers } from './tavily';

const MOCK_RESPONSE = {
  results: [
    {
      title: 'Luca Rossi Fotografia',
      url: 'https://lucarossifoto.it',
      content: 'Fotografo professionista a Milano, specializzato in matrimoni.',
    },
    {
      title: 'Studio Azzurro Photo',
      url: 'https://studioazzurro.it',
      content: 'Reportage fotografico per eventi aziendali e privati.',
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_RESPONSE,
  } as Response);
});

describe('searchTavilySuppliers', () => {
  it('returns mapped RealSupplierCandidate array', async () => {
    const results = await searchTavilySuppliers('fotografo matrimoni', 'Milano', 'TEST_KEY');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      name: 'Luca Rossi Fotografia',
      address: undefined,
      rating: undefined,
      website: 'https://lucarossifoto.it',
      snippet: 'Fotografo professionista a Milano, specializzato in matrimoni.',
      source: 'tavily',
    });
  });

  it('returns empty array when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response);
    const results = await searchTavilySuppliers('fotografo', 'Roma', 'BAD_KEY');
    expect(results).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    const results = await searchTavilySuppliers('fotografo', 'Roma', 'TEST_KEY');
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/services/tavily.test.ts
```
Expected: FAIL — `searchTavilySuppliers` not found

- [ ] **Step 3: Implement Tavily client**

```ts
// src/services/tavily.ts
import type { RealSupplierCandidate } from '@/types/supplier-discovery.types';

const TAVILY_URL = 'https://api.tavily.com/search';

export async function searchTavilySuppliers(
  query: string,
  city: string,
  apiKey: string,
  maxResults = 5,
): Promise<RealSupplierCandidate[]> {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} ${city}`,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
      }),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      results: Array<{ title: string; url: string; content?: string }>;
    };

    return (json.results ?? []).map((r) => ({
      name: r.title,
      address: undefined,
      rating: undefined,
      website: r.url,
      snippet: r.content,
      source: 'tavily' as const,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/services/tavily.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/tavily.ts src/services/tavily.test.ts
git commit -m "feat: add Tavily search client with tests"
```

---

## Task 4: Supplier discovery orchestrator + tests

**Files:**
- Create: `src/services/supplier-discovery.ts`
- Create: `src/services/supplier-discovery.test.ts`

The orchestrator maps each `RequiredService` category to the right API and query string, runs all searches in parallel, and returns `DiscoveredSuppliers`.

**Category routing:**
- Foursquare: `venue` → query `"location per eventi"`, `catering` → query `"catering eventi"`
- Tavily: `photography` → `"fotografo eventi"`, `videography` → `"videomaker eventi"`, `flowers` → `"fiorista eventi"`, `music_dj` → `"DJ eventi"`, `lighting` → `"noleggio luci eventi"`, `transportation` → `"noleggio auto cerimonie"`, `planner` → `"wedding planner"`, any unknown → `"{category} eventi"`

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/supplier-discovery.test.ts
import { describe, it, expect, vi } from 'vitest';
import { discoverSuppliers } from './supplier-discovery';
import * as fsq from './foursquare';
import * as tavily from './tavily';

const FAKE_FSQ = [{ name: 'Villa Reale', source: 'foursquare' as const }];
const FAKE_TAV = [{ name: 'Luca Rossi Foto', source: 'tavily' as const }];

vi.mock('./foursquare', () => ({ searchFoursquarePlaces: vi.fn() }));
vi.mock('./tavily', () => ({ searchTavilySuppliers: vi.fn() }));

describe('discoverSuppliers', () => {
  it('routes venue and catering to Foursquare', async () => {
    vi.mocked(fsq.searchFoursquarePlaces).mockResolvedValue(FAKE_FSQ as any);
    vi.mocked(tavily.searchTavilySuppliers).mockResolvedValue([]);

    const result = await discoverSuppliers(['venue', 'catering'], 'Milano', {
      foursquareKey: 'FSQ',
      tavilyKey: 'TAV',
    });

    expect(result.venue).toEqual(FAKE_FSQ);
    expect(result.catering).toEqual(FAKE_FSQ);
    expect(fsq.searchFoursquarePlaces).toHaveBeenCalledWith(
      'location per eventi', 'Milano', 'FSQ', 5
    );
  });

  it('routes photography to Tavily', async () => {
    vi.mocked(fsq.searchFoursquarePlaces).mockResolvedValue([]);
    vi.mocked(tavily.searchTavilySuppliers).mockResolvedValue(FAKE_TAV as any);

    const result = await discoverSuppliers(['photography'], 'Roma', {
      foursquareKey: 'FSQ',
      tavilyKey: 'TAV',
    });

    expect(result.photography).toEqual(FAKE_TAV);
    expect(tavily.searchTavilySuppliers).toHaveBeenCalledWith(
      'fotografo eventi', 'Roma', 'TAV', 5
    );
  });

  it('returns empty arrays gracefully when both APIs return nothing', async () => {
    vi.mocked(fsq.searchFoursquarePlaces).mockResolvedValue([]);
    vi.mocked(tavily.searchTavilySuppliers).mockResolvedValue([]);

    const result = await discoverSuppliers(['music_dj'], 'Napoli', {
      foursquareKey: 'FSQ',
      tavilyKey: 'TAV',
    });

    expect(result.music_dj).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/services/supplier-discovery.test.ts
```
Expected: FAIL — `discoverSuppliers` not found

- [ ] **Step 3: Implement the orchestrator**

```ts
// src/services/supplier-discovery.ts
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
  keys: DiscoveryKeys,
): Promise<DiscoveredSuppliers> {
  const searches = categories.map(async (cat) => {
    if (FOURSQUARE_CATEGORIES.has(cat)) {
      const query = FOURSQUARE_QUERIES[cat] ?? `${cat} eventi`;
      const results = await searchFoursquarePlaces(query, city, keys.foursquareKey, 5);
      return [cat, results] as const;
    }
    const query = TAVILY_QUERIES[cat] ?? `${cat} eventi`;
    const results = await searchTavilySuppliers(query, city, keys.tavilyKey, 5);
    return [cat, results] as const;
  });

  const entries = await Promise.all(searches);
  return Object.fromEntries(entries);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/services/supplier-discovery.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: Run all tests to check for regressions**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/supplier-discovery.ts src/services/supplier-discovery.test.ts
git commit -m "feat: add supplier discovery orchestrator (Foursquare + Tavily routing)"
```

---

## Task 5: Update `buildPrompt` to accept real supplier candidates

**Files:**
- Modify: `src/lib/ai.ts`

This task adds an optional `realSuppliers` field to `EventPlanInput` and rewrites the STEP 2 section of the prompt to instruct Claude to curate real candidates instead of inventing names.

- [ ] **Step 1: Add the import and update `EventPlanInput`**

In `src/lib/ai.ts`, add the import at the top and add the field to the interface:

```ts
// Add at top of file:
import type { DiscoveredSuppliers } from '@/types/supplier-discovery.types';
```

In `EventPlanInput`, add:
```ts
  /** Real candidates pre-fetched from Foursquare/Tavily. Optional — falls back to invented names. */
  realSuppliers?: DiscoveredSuppliers;
```

- [ ] **Step 2: Update `buildPrompt` — add the supplier context helper**

Add this helper function before `buildPrompt`:

```ts
function formatRealCandidates(realSuppliers: DiscoveredSuppliers): string {
  const lines: string[] = [];
  for (const [category, candidates] of Object.entries(realSuppliers)) {
    if (candidates.length === 0) continue;
    lines.push(`\nCategory: ${category}`);
    candidates.forEach((c, i) => {
      const parts = [`  ${i + 1}. ${c.name}`];
      if (c.address) parts.push(`     Address: ${c.address}`);
      if (c.website) parts.push(`     Website: ${c.website}`);
      if (c.snippet) parts.push(`     About: ${c.snippet}`);
      if (c.rating != null) parts.push(`     Rating: ${c.rating}/10`);
      lines.push(parts.join('\n'));
    });
  }
  return lines.join('\n');
}
```

- [ ] **Step 3: Update the STEP 2 instructions in the returned prompt string**

Replace the current STEP 2 block in `buildPrompt`:

```ts
// OLD — replace this block:
`STEP 2 — Then emit exactly 3 supplier lines per service category:
{"type":"supplier","data":{"name":"STRING","category":"STRING","description":"STRING","estimatedPriceUsd":NUMBER,"city":"${data.city}","isVerified":false}}

Rules for suppliers:
- "category" must exactly match a service name from the service list above
- "estimatedPriceUsd" contains a EUR amount (field name is legacy)
- prices must be realistic and proportional to the total budget
- all names and descriptions must be fictional but plausible, specific to ${data.city}
- generate exactly 3 suppliers per category, no more, no less`
```

with:

```ts
// NEW — insert this instead:
const hasRealSuppliers =
  data.realSuppliers && Object.keys(data.realSuppliers).length > 0;

const step2 = hasRealSuppliers
  ? `REAL SUPPLIER CANDIDATES (fetched from live directories):
${formatRealCandidates(data.realSuppliers!)}

STEP 2 — For each service category, emit exactly 3 supplier lines using the real candidates above:
{"type":"supplier","data":{"name":"STRING","category":"STRING","description":"STRING","estimatedPriceUsd":NUMBER,"city":"${data.city}","isVerified":false}}

Rules for suppliers:
- Prefer real candidates from the list above. Use their exact name. Keep isVerified false.
- Write "description" as 1-2 sentences explaining why this supplier fits this specific event (style, budget, requirements).
- If fewer than 3 real candidates exist for a category, invent the remaining ones — plausible, specific to ${data.city}.
- "category" must exactly match a service name from the service list above.
- "estimatedPriceUsd" contains a EUR amount proportional to the category budget allocation.
- Emit exactly 3 suppliers per category, no more, no less.`
  : `STEP 2 — Then emit exactly 3 supplier lines per service category:
{"type":"supplier","data":{"name":"STRING","category":"STRING","description":"STRING","estimatedPriceUsd":NUMBER,"city":"${data.city}","isVerified":false}}

Rules for suppliers:
- "category" must exactly match a service name from the service list above
- "estimatedPriceUsd" contains a EUR amount (field name is legacy)
- prices must be realistic and proportional to the total budget
- all names and descriptions must be fictional but plausible, specific to ${data.city}
- generate exactly 3 suppliers per category, no more, no less`;
```

Then replace the literal STEP 2 block string in the returned template literal with `${step2}`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: inject real supplier candidates into Claude prompt"
```

---

## Task 6: Wire up discovery in the API route

**Files:**
- Modify: `src/app/api/generate-suppliers/route.ts`

- [ ] **Step 1: Add the import at the top of the route file**

```ts
import { discoverSuppliers } from '@/services/supplier-discovery';
```

- [ ] **Step 2: Add the pre-fetch step after parsing input, before building the prompt**

Find the line `const prompt = buildPrompt({` and insert before it:

```ts
// Pre-fetch real supplier candidates from Foursquare + Tavily
const foursquareKey = process.env.FOURSQUARE_API_KEY ?? '';
const tavilyKey = process.env.TAVILY_API_KEY ?? '';

let realSuppliers = {};
if (foursquareKey || tavilyKey) {
  realSuppliers = await discoverSuppliers(
    data.requiredServices,
    data.city,
    { foursquareKey, tavilyKey },
  );
}
```

- [ ] **Step 3: Pass `realSuppliers` to `buildPrompt`**

Update the `buildPrompt` call:

```ts
const prompt = buildPrompt({
  eventType: data.eventType,
  date: data.eventDate,
  duration: data.duration,
  guestCount: data.guestCount,
  city: data.city,
  venuePreference: data.venuePreference,
  budgetEur: data.budgetUsd,
  stylePreferences: data.stylePreferences,
  requiredServices: data.requiredServices,
  specialRequirements: data.specialRequirements,
  specialRequests: data.specialRequests,
  outputLanguage: data.outputLanguage,
  realSuppliers,   // ← add this line
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/generate-suppliers/route.ts
git commit -m "feat: pre-fetch real suppliers from Foursquare+Tavily before Claude generation"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Verify env keys are set**

Check `.env.local` (or `.env.development`) contains non-empty values for:
```
FOURSQUARE_API_KEY=
TAVILY_API_KEY=
```

If missing, get them from: https://foursquare.com/developers/apps and https://app.tavily.com/

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Complete the wizard and generate a plan**

Navigate to `http://localhost:3000/create-event/wizard`, fill in the form with:
- City: **Milano**
- Services: photography, venue
- Budget: €5000

- [ ] **Step 4: Verify supplier names are real**

On the generated plan page, check that venue and photography supplier names match real businesses findable on Google — not generic invented names like "Milano Photo Studio".

- [ ] **Step 5: Check graceful fallback**

Temporarily set `FOURSQUARE_API_KEY=invalid` in `.env.local`, regenerate. Confirm the plan still generates (falls back to invented names) with no 500 error.

- [ ] **Step 6: Restore valid key**

Restore the real `FOURSQUARE_API_KEY` value.

---

## Self-Review Notes

**Spec coverage:**
- Foursquare for venues/caterers ✅ (Task 2 + Task 4)
- Tavily for photographers/DJs/etc ✅ (Task 3 + Task 4)
- Real names injected into Claude prompt ✅ (Task 5)
- Graceful fallback when APIs are unavailable ✅ (Task 6 — empty `{}` means Claude falls back to invented names)
- No breaking changes to existing wizard or plan page ✅ (only API route and prompt builder modified)

**Open questions for after MVP:**
- The `isVerified: false` flag is preserved — future work can add a verification flow where businesses claim their profile
- `estimatedPriceUsd` field name is legacy; tracked but left for now to avoid breaking the plan page
