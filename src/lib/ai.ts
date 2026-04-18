// AI prompt building for Fentsi event plan generation.
// Used by POST /api/generate-suppliers.

import type { DiscoveredSuppliers } from '@/types/supplier-discovery.types';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface EventPlanInput {
  eventType: string;
  date: string | null;
  duration: string;
  guestCount: number;
  city: string;
  venuePreference: string | null;
  budgetEur: number;
  stylePreferences: string[];
  requiredServices: string[];
  specialRequirements: string[];
  specialRequests?: string;
  outputLanguage: string;
  realSuppliers?: DiscoveredSuppliers;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const REQUIREMENT_LABELS: Record<string, string> = {
  vegetarian: 'vegetarian menu required',
  vegan: 'vegan menu required',
  gluten_free: 'gluten-free menu required',
  halal: 'halal catering required',
  kosher: 'kosher catering required',
  wheelchair_access: 'full wheelchair/disability accessibility required',
  outdoor_permit: 'outdoor event permit required',
  international_guests:
    'international guests (multilingual support, visa logistics)',
};

const DURATION_LABELS: Record<string, string> = {
  half_day: 'half day (4–6 hours)',
  full_day: 'full day (8–12 hours)',
  weekend: 'full weekend (2 days)',
};

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

export function buildPrompt(data: EventPlanInput): string {
  const budget = data.budgetEur;
  const contingency = Math.round(budget * 0.1);

  const requirementsList =
    data.specialRequirements.length > 0
      ? data.specialRequirements
          .map((r) => `  - ${REQUIREMENT_LABELS[r] ?? r}`)
          .join('\n')
      : '  - none';

  const durationLabel = DURATION_LABELS[data.duration] ?? data.duration;

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

  return `You are an expert Italian event planning concierge specialising in luxury and mid-range events in Italy.

LANGUAGE: Respond entirely in ${data.outputLanguage}. All venue names, vendor names, tips, and recommendations must be written in ${data.outputLanguage}.

EVENT DETAILS:
- Type: ${data.eventType}
- Date: ${data.date ?? 'TBD'}
- Duration: ${durationLabel}
- Guests: ${data.guestCount}
- City: ${data.city}
- Venue preference: ${data.venuePreference ?? 'no preference'}
- Budget: €${budget.toLocaleString('it-IT')} EUR total
- Style: ${data.stylePreferences.join(', ') || 'flexible'}
- Special requirements:
${requirementsList}
- Additional notes: ${data.specialRequests || 'none'}

SERVICE CATEGORIES TO FILL:
${data.requiredServices.map((s) => `- ${s}`).join('\n')}

OUTPUT FORMAT:
Emit NDJSON lines in this exact order — one compact JSON object per line, no markdown, no code fences, no trailing whitespace.

STEP 1 — First line must be the plan overview (exactly one line):
{"type":"plan_overview","data":{"budgetBreakdown":{"catering":NUMBER,"photography":NUMBER,"video":NUMBER,"venue":NUMBER,"flowers_decor":NUMBER,"music":NUMBER,"transportation":NUMBER,"other":NUMBER,"contingency_eur":${contingency}},"alerts":[{"type":"permit|seasonal|cultural|logistic","message":"STRING","severity":"high|medium|low"}],"logistics":{"transportation":["STRING","STRING"],"accommodation":["STRING","STRING"]},"catering":{"approach":"STRING","menuConcept":"STRING"}}}

Rules for plan_overview:
- budgetBreakdown: amounts in EUR, sum of all categories (excluding contingency_eur) ≈ €${budget.toLocaleString('it-IT')}; only include categories present in the service list above; set unused categories to 0
- contingency_eur is always €${contingency} (10% of total budget)
- alerts: 1–3 relevant alerts specific to this event (permits, seasonal factors, cultural notes, logistical challenges)
- logistics.transportation: 2–3 practical tips for guest transport to/from the venue city
- logistics.accommodation: 2–3 concrete hotel or B&B recommendations near ${data.city}
- catering.approach: one sentence on service style (e.g. buffet, plated, live stations)
- catering.menuConcept: 1–2 sentences on menu theme and how it addresses the special requirements above

${step2}

STEP 3 — Final line:
{"type":"done","status":"ok"}`;
}
