import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { generatePlanSchema } from '@/lib/validators/plan';
import { guestTiers } from '@/lib/data/guest-tiers';
import { venueStyles, decorMoods, cateringStyles, extrasOptions } from '@/lib/data/wizard-options';

export const runtime = 'nodejs';
export const maxDuration = 120; // AI calls can be slow

// ---------------------------------------------------------------------------
// Vendor type mapping (wizard allocation categories → DB enum)
// ---------------------------------------------------------------------------

const categoryToVendorType = {
  venue: 'venue',
  catering: 'catering',
  decor: 'decor',
  entertainment: 'entertainment',
  av: 'av',
  photo_video: 'photo',
  misc: 'planner',
} as const;

// ---------------------------------------------------------------------------
// Prompt builder (adapted for the new wizard plan structure)
// ---------------------------------------------------------------------------

function buildPlanPrompt({
  eventTypeName,
  guestCount,
  budgetEur,
  venueStyle,
  cateringStyleLabels,
  decorMoodLabel,
  extraLabels,
  briefDescription,
  requiredCategories,
  locale,
}: {
  eventTypeName: string;
  guestCount: number;
  budgetEur: number;
  venueStyle: string | null;
  cateringStyleLabels: string[];
  decorMoodLabel: string | null;
  extraLabels: string[];
  briefDescription: string | null;
  requiredCategories: string[];
  locale: string;
}) {
  const contingency = Math.round(budgetEur * 0.1);

  return `You are an expert Italian event planning concierge specialising in luxury and mid-range events in Italy.

LANGUAGE: Respond entirely in ${locale === 'it' ? 'Italian' : 'English'}. All names, descriptions, and recommendations must be in ${locale === 'it' ? 'Italian' : 'English'}.

EVENT DETAILS:
- Type: ${eventTypeName}
- Guests: approximately ${guestCount}
- Budget: €${budgetEur.toLocaleString('it-IT')} EUR total
- Venue preference: ${venueStyle ?? 'no preference'}
- Catering style: ${cateringStyleLabels.join(', ') || 'flexible'}
- Mood / decor: ${decorMoodLabel ?? 'flexible'}
- Extras requested: ${extraLabels.join(', ') || 'none'}
- Creative brief: ${briefDescription ?? 'none provided'}

SERVICE CATEGORIES TO FILL:
${requiredCategories.map((c) => `- ${c}`).join('\n')}

OUTPUT FORMAT:
Emit NDJSON — one compact JSON object per line, no markdown, no code fences.

STEP 1 — First line: plan overview (exactly one line):
{"type":"plan_overview","data":{"budgetBreakdown":{"catering":NUMBER,"venue":NUMBER,"decor":NUMBER,"entertainment":NUMBER,"av":NUMBER,"photo_video":NUMBER,"misc":NUMBER,"contingency_eur":${contingency}},"alerts":[{"type":"permit|seasonal|cultural|logistic","message":"STRING","severity":"high|medium|low"}],"logistics":{"transportation":["STRING","STRING"],"accommodation":["STRING","STRING"]},"catering":{"approach":"STRING","menuConcept":"STRING"}}}

Rules for plan_overview:
- budgetBreakdown: EUR amounts, sum of all categories (excluding contingency_eur) ≈ €${budgetEur.toLocaleString('it-IT')}; set unused categories to 0
- contingency_eur is always €${contingency}
- alerts: 1–3 relevant, actionable alerts (permits, seasonality, logistics)
- logistics.transportation: 2 practical guest transport tips
- logistics.accommodation: 2 concrete hotel recommendations in Italy
- catering: match the catering style and event mood above

STEP 2 — Then emit exactly 3 supplier lines per service category:
{"type":"supplier","data":{"name":"STRING","category":"STRING","description":"STRING","estimatedPriceEur":NUMBER}}

Rules for suppliers:
- "category" must exactly match a category name from the service list above
- "estimatedPriceEur": realistic EUR amount proportional to the budget allocation for that category
- Invent plausible, specific Italian supplier names
- "description": 1–2 sentences on why this supplier fits this event (style, budget, mood)
- Emit exactly 3 suppliers per category, no more, no less

STEP 3 — Final line:
{"type":"done","status":"ok"}`;
}

// ---------------------------------------------------------------------------
// POST /api/generate-plan
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 });
  }

  const parsed = generatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { planId, locale } = parsed.data;

  // ── Load plan ─────────────────────────────────────────────────────────────
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, event_type_id, guests_tier, total_budget_eur, locale, status')
    .eq('id', planId)
    .eq('user_id', user.id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: 'Piano non trovato' }, { status: 404 });
  }

  if (plan.status === 'generated') {
    return NextResponse.json({ error: 'Piano già generato' }, { status: 409 });
  }

  // ── Load plan allocations ─────────────────────────────────────────────────
  const { data: allocations } = await supabase
    .from('plan_allocations')
    .select('category, percent, amount_eur')
    .eq('plan_id', planId);

  // ── Load plan choices ─────────────────────────────────────────────────────
  const { data: choices } = await supabase
    .from('plan_choices')
    .select('venue_style, catering_styles, decor_mood, extras')
    .eq('plan_id', planId)
    .maybeSingle();

  // ── Load brief description ────────────────────────────────────────────────
  const { data: briefAsset } = await supabase
    .from('plan_brief_assets')
    .select('title')
    .eq('plan_id', planId)
    .eq('url', 'text:brief')
    .maybeSingle();

  // ── Load event type name ──────────────────────────────────────────────────
  let eventTypeName = plan.event_type_id ?? 'Evento';
  if (plan.event_type_id) {
    const { data: eventType } = await supabase
      .from('event_types')
      .select('name')
      .eq('id', plan.event_type_id)
      .maybeSingle();
    if (eventType?.name) eventTypeName = eventType.name;
  }

  // ── Resolve guest count from tier ─────────────────────────────────────────
  const tier = guestTiers.find((t) => t.id === plan.guests_tier);
  const guestCount = tier ? Math.round((tier.min + (tier.max ?? tier.min * 2)) / 2) : 100;

  // ── Resolve label strings ─────────────────────────────────────────────────
  const venueStyleLabel =
    venueStyles.find((v) => v.id === choices?.venue_style)?.label ?? choices?.venue_style ?? null;

  const cateringStyleLabels =
    (choices?.catering_styles ?? []).map(
      (id) => cateringStyles.find((c) => c.id === id)?.label ?? id
    );

  const decorMoodLabel =
    decorMoods.find((d) => d.id === choices?.decor_mood)?.label ?? choices?.decor_mood ?? null;

  const extraLabels =
    (choices?.extras ?? []).map(
      (id) => extrasOptions.find((e) => e.id === id)?.label ?? id
    );

  // ── Determine which service categories to fill ────────────────────────────
  const requiredCategories = (allocations ?? [])
    .filter((a) => a.percent > 0)
    .map((a) => a.category);

  if (requiredCategories.length === 0) {
    return NextResponse.json(
      { error: 'Nessuna categoria di budget allocata. Completa lo step allocazione.' },
      { status: 400 }
    );
  }

  const budget = plan.total_budget_eur ?? 5000;

  // ── Build and send prompt to Anthropic ────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const prompt = buildPlanPrompt({
    eventTypeName,
    guestCount,
    budgetEur: budget,
    venueStyle: venueStyleLabel,
    cateringStyleLabels,
    decorMoodLabel,
    extraLabels,
    briefDescription: briefAsset?.title ?? null,
    requiredCategories,
    locale,
  });

  let rawText = '';
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    rawText =
      message.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('') ?? '';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Anthropic API error';
    console.error('[/api/generate-plan] Anthropic error:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // ── Parse NDJSON output ───────────────────────────────────────────────────
  type SupplierData = {
    name: string;
    category: string;
    description: string;
    estimatedPriceEur: number;
  };

  const suppliers: SupplierData[] = [];

  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.type === 'supplier' && obj.data) {
        suppliers.push(obj.data as SupplierData);
      }
    } catch {
      // ignore malformed lines
    }
  }

  // ── Save generated vendors + matches via service role ─────────────────────
  const supabaseAdmin = createSupabaseServiceClient();

  let savedCount = 0;

  for (const supplier of suppliers) {
    const vendorType =
      categoryToVendorType[supplier.category as keyof typeof categoryToVendorType] ?? 'planner';

    // Insert the vendor
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .insert({
        name: supplier.name,
        type: vendorType,
        direct_partner: false,
        active: false, // AI-generated; not yet a real partner
        tags: [supplier.category],
      })
      .select('id')
      .single();

    if (vendorError || !vendor) {
      console.error('[/api/generate-plan] vendor insert error:', vendorError?.message);
      continue;
    }

    // Insert the vendor match
    const { error: matchError } = await supabaseAdmin.from('vendor_matches').insert({
      plan_id: planId,
      vendor_id: vendor.id,
      rank: null,
      reason: supplier.description,
      direct_partner: false,
    });

    if (matchError) {
      console.error('[/api/generate-plan] vendor_match insert error:', matchError.message);
    } else {
      savedCount++;
    }
  }

  // ── Mark plan as generated ────────────────────────────────────────────────
  await supabaseAdmin
    .from('plans')
    .update({ status: 'generated' })
    .eq('id', planId);

  return NextResponse.json({
    ok: true,
    planId,
    vendorsGenerated: savedCount,
  });
}
