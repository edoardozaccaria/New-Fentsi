// AI prompt building for Fentsi event plan generation.
// Used by POST /api/generate-suppliers.

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

STEP 2 — Then emit exactly 3 supplier lines per service category:
{"type":"supplier","data":{"name":"STRING","category":"STRING","description":"STRING","estimatedPriceUsd":NUMBER,"city":"${data.city}","isVerified":false}}

Rules for suppliers:
- "category" must exactly match a service name from the service list above
- "estimatedPriceUsd" contains a EUR amount (field name is legacy)
- prices must be realistic and proportional to the total budget
- all names and descriptions must be fictional but plausible, specific to ${data.city}
- generate exactly 3 suppliers per category, no more, no less

STEP 3 — Final line:
{"type":"done","status":"ok"}`;
}
