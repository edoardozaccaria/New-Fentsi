import Anthropic from '@anthropic-ai/sdk'
import { OnboardingData, EventPlan, BudgetBreakdown, VendorSuggestion } from '@/types/event'

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding:     'Wedding',
  birthday:    'Birthday Party',
  anniversary: 'Anniversary',
  corporate:   'Corporate Event',
  christening: 'Christening',
  graduation:  'Graduation Party',
  other:       'Special Event',
}

// ── Build prompt with real Foursquare vendor data injected ───────────────────
function buildPrompt(data: OnboardingData, realVendors: Record<string, VendorSuggestion[]>): string {
  const locationDesc =
    data.locationType === 'chosen'
      ? `Already chosen: ${data.locationDetails}`
      : data.locationType === 'ideas'
      ? `Has ideas: ${data.locationDetails}`
      : 'Needs help finding a venue'

  const hasRealVendors = Object.keys(realVendors).length > 0

  const allCategories = Array.from(
    new Set(['venue', ...data.services.filter(Boolean)])
  )

  // Budget per guest helps Claude judge if a vendor's price tier is appropriate
  const budgetPerGuest = Math.round(data.budget / Math.max(data.guestsCount, 1))
  const budgetTier =
    budgetPerGuest < 40  ? 'budget (€ or €€ vendors)'     :
    budgetPerGuest < 80  ? 'mid-range (€€ or €€€ vendors)' :
    budgetPerGuest < 150 ? 'premium (€€€ vendors)'          :
                           'luxury (€€€ or €€€€ vendors)'

  const vendorContext = hasRealVendors
    ? Object.entries(realVendors)
        .map(([cat, vendors]) => {
          // Pass ALL candidates (up to 7) so Claude can rank and choose the best 3
          const list = vendors
            .map(
              (v, i) =>
                `  ${i + 1}. ${v.name} | ${v.address || 'local area'} | Rating: ${v.rating}/5 | Price: ${v.priceRange} | Website: ${v.website} | Maps: ${v.googleMapsUri || 'n/a'}`
            )
            .join('\n')
          return `[${cat.toUpperCase()} — ${vendors.length} candidates, pick best 3]\n${list}`
        })
        .join('\n\n')
    : `No real vendor data available — create plausible, named vendors specific to ${data.region || 'the destination'}.`

  const categoryCount = hasRealVendors ? Object.keys(realVendors).length : allCategories.length
  const totalVendors  = categoryCount * 3

  const stylesStr = data.styles.length > 0 ? data.styles.join(', ') : 'elegant'
  const prioritiesStr = data.priorities.length > 0 ? data.priorities.slice(0, 2).join(' and ') : 'quality'

  return `You are Fentsi, a world-class AI event planner. Create a comprehensive, highly personalised event plan.

EVENT DETAILS:
Type: ${EVENT_TYPE_LABELS[data.eventType || 'other']}
Date: ${data.eventDate || 'TBD'}
Guests: ${data.guestsCount}
Budget: EUR ${data.budget.toLocaleString('en-US')}
Venue situation: ${locationDesc}
Destination: ${data.region || 'Not specified'}${data.locationLat ? ` [${data.locationLat.toFixed(4)}, ${data.locationLng?.toFixed(4)}]` : ''}
Style/Mood: ${stylesStr}
Priorities: ${data.priorities.join(', ') || 'balanced'}
Required services: ${data.services.join(', ') || 'standard'}

REAL LOCAL VENDORS (Foursquare Places data for ${data.region || 'area'}):
${vendorContext}

═══ CLIENT SELECTION CRITERIA ═══
Use these criteria to RANK and CHOOSE the best 3 vendors per category:
• Style match: client wants "${data.styles.join(', ')}" — prefer vendors whose name/description signals this aesthetic
• Budget tier: ${budgetTier} — prefer vendors in this price range; skip vendors clearly outside it
• Guest count: ${data.guestsCount} guests — prefer venues/caterers that can handle this scale
• Event type: ${EVENT_TYPE_LABELS[data.eventType || 'other']} — prefer vendors specialised for this event
• Rating: higher-rated vendors preferred all else equal
• Top priorities: ${data.priorities.slice(0, 3).join(', ')}

═══ INSTRUCTIONS ═══
${hasRealVendors
  ? `• For each category above, RANK the candidates using the selection criteria, then OUTPUT EXACTLY the 3 best matches
• Do NOT include all candidates blindly — actively EXCLUDE vendors that conflict with style or budget
• Use the REAL vendor names, addresses, ratings, and website URLs exactly as provided — do NOT invent or modify them
• For each selected vendor write a personalised "description" (2 sentences) explaining WHY this vendor fits this specific event style and type
• For each selected vendor write a "whyRecommended" (1 sentence) referencing a specific priority: ${data.priorities.slice(0, 2).join(' or ')}
• budgetAllocation = the euro amount allocated per vendor from the category's budget slice
• Copy "website" and "googleMapsUri" fields verbatim — never change URLs
• If a category has fewer than 3 suitable candidates, add plausible named local vendors to reach 3`
  : `• OUTPUT EXACTLY 3 vendors for EACH of these categories: ${allCategories.join(', ')} (${totalVendors} vendors total)
• Create realistic, named vendors specific to ${data.region || 'the destination'} that match the "${data.styles.join(', ')}" aesthetic
• Each description must explain WHY the vendor fits this specific event style, type, and budget tier: ${budgetTier}
• For website, use a realistic URL: https://[vendorname-slugified].${data.region?.split(',')[0]?.toLowerCase().replace(/\s+/g, '') || 'example'}.com`}
• budgetBreakdown must sum to EXACTLY €${data.budget}
• Allocate budget based on stated priorities: ${data.priorities.slice(0, 3).join(', ')}
• Budget per guest: ~€${data.guestsCount > 0 ? Math.round(data.budget / data.guestsCount) : 0}

Respond ONLY with valid JSON (no markdown, no code fences, no extra text):

{
  "title": "personalised event title referencing destination and style",
  "summary": "engaging 2-3 sentence description specific to this client, destination, and mood",
  "locationDisplay": "${data.region || 'your destination'}",
  "budgetBreakdown": {
    "catering": 0, "photography": 0, "video": 0, "venue": 0,
    "flowers_decor": 0, "music": 0, "wedding_cake": 0,
    "attire": 0, "transport": 0, "other": 0
  },
  "vendors": [
    {
      "name": "vendor name",
      "category": "Category Label",
      "description": "2-sentence personalised description",
      "priceRange": "EUR EUR",
      "rating": 4.8,
      "reviewCount": 0,
      "tags": ["style-tag", "location-tag", "service-tag"],
      "address": "full address",
      "website": "https://...",
      "googleMapsUri": "https://foursquare.com/v/...",
      "phone": "+39... or null",
      "budgetAllocation": 0,
      "whyRecommended": "One sentence referencing client priorities"
    }
  ],
  "timeline": [
    { "date": "12 months before", "task": "specific action", "priority": "high" }
  ],
  "tips": ["tip 1", "tip 2", "tip3", "tip4", "tip5"],
  "score": 92
}

Include: EXACTLY 3 vendors per category (${totalVendors} total), 10-12 timeline entries (12 months before to day-of), 5 personalised tips.`
}

// ── Main AI generation ────────────────────────────────────────────────────────
export async function generateEventPlan(
  data: OnboardingData,
  realVendors: Record<string, VendorSuggestion[]> = {}
): Promise<EventPlan> {
  const prompt = buildPrompt(data, realVendors)

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: 'You are Fentsi, the best AI event planner in the world. Always respond with valid JSON only — no markdown, no code blocks, no extra text.',
    messages: [{ role: 'user', content: prompt }],
  })

  // Safely extract text content
  const firstBlock = response.content[0]
  if (!firstBlock || firstBlock.type !== 'text') {
    throw new Error('AI response did not contain text content')
  }

  const raw = firstBlock.text
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[ai] Invalid JSON from Claude:', cleaned.slice(0, 500))
    throw new Error('AI returned invalid response. Please try again.')
  }

  // Merge real vendor photo/maps/website data into AI-generated vendor objects
  const allReal = Object.values(realVendors).flat()
  const enrichedVendors: VendorSuggestion[] = ((parsed.vendors ?? []) as VendorSuggestion[]).map((v: VendorSuggestion) => {
    // Match by full name containment (not just first word, to avoid "Villa X" matching "Villa Y")
    const match = allReal.find(
      (r) =>
        r.name.toLowerCase() === v.name.toLowerCase() ||
        r.name.toLowerCase().includes(v.name.toLowerCase()) ||
        v.name.toLowerCase().includes(r.name.toLowerCase())
    )
    if (!match) return v
    return {
      ...v,
      name:          match.name,
      address:       match.address   ?? v.address,
      phone:         match.phone     ?? v.phone,
      website:       match.website   ?? v.website,
      googleMapsUri: match.googleMapsUri ?? v.googleMapsUri,
      photoUrl:      match.photoUrl  ?? v.photoUrl,
      rating:        match.rating    ?? v.rating,
      priceRange:    match.priceRange ?? v.priceRange,
    }
  })

  return {
    id: crypto.randomUUID(),
    ...parsed,
    vendors: enrichedVendors,
    vendorsFromGooglePlaces: Object.keys(realVendors).length > 0,
    createdAt: new Date().toISOString(),
  } as EventPlan
}

// ── Mock plan (when no Anthropic key set) ─────────────────────────────────────
export function getMockPlan(data: OnboardingData): EventPlan {
  const b = data.budget
  const breakdown: BudgetBreakdown = {
    catering:     Math.round(b * 0.32),
    photography:  Math.round(b * 0.12),
    video:        Math.round(b * 0.07),
    venue:        Math.round(b * 0.22),
    flowers_decor: Math.round(b * 0.08),
    music:        Math.round(b * 0.07),
    wedding_cake: Math.round(b * 0.03),
    attire:       Math.round(b * 0.04),
    transport:    Math.round(b * 0.02),
    other:        Math.round(b * 0.03),
  }
  const location = data.region || 'your destination'
  const style = data.styles[0] || 'elegant'

  return {
    id: crypto.randomUUID(),
    title: `${EVENT_TYPE_LABELS[data.eventType || 'other']} — ${data.contactName || 'Your Event'} in ${location}`,
    summary: `A ${style} event for ${data.guestsCount} guests in ${location}. EUR ${b.toLocaleString('en-US')} budget optimised across every detail, with focus on ${data.priorities[0]?.replace('_', ' ') || 'quality'}.`,
    locationDisplay: location,
    budgetBreakdown: breakdown,
    vendorsFromGooglePlaces: false,
    vendors: [
      { name: 'Villa Belvedere',        category: 'Venue',           description: `Historic estate with panoramic gardens, ideal for ${data.guestsCount} guests`,           priceRange: '\u20AC\u20AC\u20AC', rating: 4.9, reviewCount: 87,  tags: ['panoramic', 'historic', 'gardens'], budgetAllocation: breakdown.venue,        whyRecommended: 'Their space perfectly matches your style and guest count' },
      { name: 'Chef Marco Catering',    category: 'Catering',        description: 'Contemporary cuisine with locally sourced seasonal ingredients',                          priceRange: '\u20AC\u20AC\u20AC', rating: 4.8, reviewCount: 142, tags: ['seasonal', 'customisable', 'fine dining'], budgetAllocation: breakdown.catering,     whyRecommended: 'Seasonal menus complement your regional destination perfectly' },
      { name: 'Light & Life Photo',     category: 'Photography',     description: 'Natural reportage and editorial portraits, storytelling-focused',                          priceRange: '\u20AC\u20AC',  rating: 4.9, reviewCount: 203, tags: ['editorial', 'natural', 'storytelling'], budgetAllocation: breakdown.photography,  whyRecommended: 'Documentary style captures real emotions — matches your priorities' },
      { name: 'Bloom & Petal Floristry',category: 'Flowers & D\u00E9cor', description: `Seasonal ${style} floral arrangements with sustainable sourcing`,                        priceRange: '\u20AC\u20AC',  rating: 4.7, reviewCount: 98,  tags: ['botanical', 'seasonal', 'sustainable'], budgetAllocation: breakdown.flowers_decor, whyRecommended: `Their ${style} aesthetic will transform every corner of your venue` },
      { name: 'DJ Alex Events',         category: 'Music',           description: '15+ years experience, custom sets from ceremony to last dance',                           priceRange: '\u20AC\u20AC',  rating: 4.8, reviewCount: 176, tags: ['wedding specialist', 'live mixing'], budgetAllocation: breakdown.music,        whyRecommended: 'Reads the room perfectly — ceremony ambience to reception energy' },
    ],
    timeline: [
      { date: '12 months before', task: 'Book venue and catering — peak dates fill fast',    priority: 'high'   },
      { date: '10 months before', task: 'Book photographer and videographer',                 priority: 'high'   },
      { date: '8 months before',  task: 'Send save-the-dates',                               priority: 'medium' },
      { date: '6 months before',  task: 'Finalise catering menu and do tasting',             priority: 'medium' },
      { date: '5 months before',  task: 'Confirm florist and d\u00E9cor concept',                 priority: 'medium' },
      { date: '4 months before',  task: 'Book music and discuss playlists',                  priority: 'medium' },
      { date: '3 months before',  task: 'Confirm all vendors and sign contracts',             priority: 'high'   },
      { date: '2 months before',  task: 'Send formal invitations, collect dietary info',     priority: 'high'   },
      { date: '1 month before',   task: 'Final venue walkthrough',                           priority: 'medium' },
      { date: '2 weeks before',   task: 'Confirm final guest count with all vendors',        priority: 'high'   },
      { date: '1 week before',    task: 'Final vendor briefing',                             priority: 'high'   },
      { date: 'Day of event',     task: 'Enjoy every moment — everything is in place',      priority: 'low'    },
    ],
    tips: [
      `With ${data.guestsCount} guests, ensure a wet-weather contingency for any outdoor elements`,
      'Book key vendors 10–12 months ahead for peak-season dates',
      `Your catering budget of ~€${data.guestsCount > 0 ? Math.round(breakdown.catering / data.guestsCount) : 0} per person allows for quality upgrades`,
      'A local day-of coordinator lets you enjoy the event instead of managing logistics',
      'One shared document for all vendor contacts, contracts and dates keeps everything organised',
    ],
    score: 91,
    createdAt: new Date().toISOString(),
  }
}
