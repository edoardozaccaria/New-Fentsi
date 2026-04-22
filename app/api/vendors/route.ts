/**
 * POST /api/vendors
 *
 * Uses Claude AI to generate rich, contextual vendor suggestions for each
 * event category. No external Places API required — just ANTHROPIC_API_KEY.
 *
 * Returns 3 AI-generated candidates per category with:
 *   - Realistic business profiles tailored to the event style & budget
 *   - Amazon.it product links for product-heavy categories (decor, lighting, etc.)
 *   - Why-recommended reasoning specific to the event
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { VendorSuggestion } from '@/types/event'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// ── Tavily web search helper ───────────────────────────────────────────────────
async function tavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.warn('[vendors:tavily] TAVILY_API_KEY not set — skipping real search')
    return 'No web search results available (TAVILY_API_KEY not configured).'
  }

  console.log(`[vendors:tavily] 🔍 Searching web for: "${query}"`)

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  })

  if (!res.ok) {
    console.error(`[vendors:tavily] Search failed: ${res.status} ${res.statusText}`)
    return 'Web search failed — no results available.'
  }

  const data = await res.json()
  const results = (data.results ?? []) as Array<{ title: string; url: string; content: string }>

  console.log(`[vendors:tavily] ✅ Got ${results.length} results for: "${query}"`)

  if (!results.length) return 'No results found for this query.'

  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content?.slice(0, 300)}`)
    .join('\n\n')
}

export const dynamic = 'force-dynamic'

// Rate limit: 20 vendor searches per IP per 10 minutes
const RATE_LIMIT = { limit: 20, windowSeconds: 600 }

// Categories where product links (Amazon.it) are particularly relevant
const PRODUCT_CATEGORIES = new Set([
  'flowers_decor',
  'lighting',
  'wedding_cake',
  'transport',
  'entertainment',
])

// Human-readable category labels for the prompt
const CATEGORY_LABELS: Record<string, string> = {
  venue:           'Location / Venue',
  catering:        'Catering & Banqueting',
  photography:     'Photography',
  video:           'Videography',
  flowers_decor:   'Flowers & Decoration',
  music:           'Music & DJ',
  wedding_cake:    'Wedding Cake & Pastry',
  wedding_planner: 'Wedding Planner & Coordinator',
  transport:       'Transport & Limousine',
  entertainment:   'Entertainment & Photo Booth',
  lighting:        'Lighting & Stage Design',
}

// Amazon.it search templates per category
const AMAZON_SEARCH_TEMPLATES: Record<string, { title: string; keywords: string; description: string }[]> = {
  flowers_decor: [
    { title: 'Centrotavola matrimonio',       keywords: 'centrotavola+matrimonio+elegante',         description: 'Composizioni floreali per tavoli' },
    { title: 'Ghirlanda luminosa decorativa', keywords: 'ghirlanda+luci+matrimonio+decorazione',    description: 'Luci calde per un\'atmosfera magica' },
    { title: 'Arco floreale cerimonia',       keywords: 'arco+floreale+artificiale+matrimonio',      description: 'Sfondo perfetto per la cerimonia' },
  ],
  lighting: [
    { title: 'Faretti LED da eventi',         keywords: 'faretti+LED+eventi+colorati',              description: 'Illuminazione professionale per sale' },
    { title: 'Palloncini luminosi LED',        keywords: 'palloncini+LED+matrimonio+decorazione',    description: 'Decorazioni luminose galleggianti' },
    { title: 'String lights outdoor',         keywords: 'luci+stringa+esterno+party+matrimonio',    description: 'Illuminazione atmosferica per outdoor' },
  ],
  wedding_cake: [
    { title: 'Cake topper personalizzato',    keywords: 'cake+topper+matrimonio+personalizzato',    description: 'Decorazione per il top della torta' },
    { title: 'Vassoio porta torta elegante',  keywords: 'vassoio+porta+torta+matrimonio+argento',  description: 'Alzata elegante per servire la torta' },
    { title: 'Kit decorazione pasticceria',   keywords: 'kit+decorazione+torta+matrimonio+glitter', description: 'Strumenti per decorare' },
  ],
  transport: [
    { title: 'Just Married auto decorazione', keywords: 'decorazione+auto+matrimonio+just+married', description: 'Decora l\'auto degli sposi' },
    { title: 'Fiori auto sposi',              keywords: 'fiori+decorazione+auto+sposi+bianchi',    description: 'Composizioni floreali per l\'auto' },
    { title: 'Ribbon & bow set auto',         keywords: 'nastro+fiocco+auto+matrimonio+bianco',    description: 'Set completo decorazione auto' },
  ],
  entertainment: [
    { title: 'Photo booth props kit',         keywords: 'photo+booth+props+matrimonio+kit',         description: 'Accessori divertenti per foto ricordo' },
    { title: 'Libro degli ospiti polaroid',   keywords: 'libro+ospiti+polaroid+matrimonio',         description: 'Raccoglitore foto con messaggi' },
    { title: 'Fuochi artificiali a freddo',   keywords: 'sparkle+machine+matrimonio+effetti',       description: 'Effetti speciali sicuri per interni' },
  ],
}

interface AIVendor {
  name: string
  description: string
  priceRange: string
  rating: number
  reviewCount: number
  address: string
  phone: string
  website: string
  whyRecommended: string
  budgetAllocation: number
}

// ── Generate vendors with Claude — FORCED to use web search ──────────────────
async function generateCategoryVendors(
  category: string,
  eventType: string,
  style: string,
  budget: number,
  guestsCount: number,
  locationName: string,
  anthropic: Anthropic,
): Promise<VendorSuggestion[]> {
  const label = CATEGORY_LABELS[category] ?? category
  const isProductCat = PRODUCT_CATEGORIES.has(category)

  const BUDGET_SHARES: Record<string, number> = {
    venue: 0.30, catering: 0.35, photography: 0.08, video: 0.05,
    flowers_decor: 0.06, music: 0.04, wedding_cake: 0.03,
    wedding_planner: 0.04, transport: 0.02, entertainment: 0.02, lighting: 0.01,
  }
  const categoryBudget = Math.round(budget * (BUDGET_SHARES[category] ?? 0.05))

  // Tool definition: Claude MUST call this before generating any vendor data
  const webSearchTool: Anthropic.Tool = {
    name: 'web_search',
    description:
      'Search the web for real, verifiable vendor businesses. YOU MUST call this tool before returning any vendor data. DO NOT invent vendors — only use what you find here.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find real vendors',
        },
      },
      required: ['query'],
    },
  }

  const systemPrompt = `You are an expert event planner assistant.
CRITICAL RULES — READ CAREFULLY:
1. YOU ARE OBLIGATED to call the web_search tool FIRST before producing any vendor list.
2. DO NOT invent, fabricate, or hallucinate any vendor. Every vendor MUST come from real web search results.
3. All vendor URLs ("website" field) MUST be real, verifiable URLs found in the search results.
4. If search results are insufficient, call web_search again with a refined query.
5. Only after calling web_search may you produce the final JSON array.`

  const userPrompt = `Find exactly 3 real "${label}" vendors for a ${eventType} event in ${locationName || 'Italy'}.

Event context:
- Style: ${style || 'elegant'}
- Total budget: €${budget.toLocaleString('it-IT')}
- Guests: ${guestsCount}
- Category budget: approx €${categoryBudget.toLocaleString('it-IT')}

STEP 1: Call web_search with a query like: "${label} ${eventType} ${locationName} prezzi recensioni"
STEP 2: Based ONLY on what you found, return a JSON array of exactly 3 vendors:
[
  {
    "name": "exact business name from search",
    "description": "2 sentences about their strengths",
    "priceRange": "€X,XXX – €X,XXX",
    "rating": 4.7,
    "reviewCount": 89,
    "address": "Via ..., City",
    "phone": "+39 0XX XXX XXXX",
    "website": "https://real-url-from-search-results.it",
    "whyRecommended": "1 sentence referencing the event type and style",
    "budgetAllocation": ${Math.round(categoryBudget * 0.9)}
  }
]

Return ONLY the JSON array — no markdown, no explanation.`

  try {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userPrompt },
    ]

    let searchResults = ''
    let finalText = ''

    // Agentic loop: keep going until we get a text response (after tool use)
    for (let turn = 0; turn < 5; turn++) {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        tools: [webSearchTool],
        // Force the AI to use the tool on the first turn
        tool_choice: turn === 0 ? { type: 'any' as const } : { type: 'auto' as const },
        messages,
      })

      // Check if the model wants to use a tool
      const toolUseBlock = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      const textBlock = msg.content.find((b): b is Anthropic.TextBlock => b.type === 'text')

      if (toolUseBlock && toolUseBlock.name === 'web_search') {
        const input = toolUseBlock.input as { query: string }
        console.log(`[vendors:tool] 🔧 web_search called for category="${category}" query="${input.query}"`)

        // Execute the real web search
        searchResults = await tavilySearch(input.query)
        console.log(`[vendors:tool] 📄 Search results preview: ${searchResults.slice(0, 200)}...`)

        // Feed results back to Claude
        messages.push({ role: 'assistant', content: msg.content })
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUseBlock.id,
              content: searchResults,
            },
          ],
        })
        continue
      }

      if (textBlock) {
        finalText = textBlock.text
        console.log(`[vendors] ✅ AI produced vendor JSON for category="${category}" (used search: ${!!searchResults})`)
        break
      }

      // Unexpected: no tool use and no text — break to avoid infinite loop
      console.warn(`[vendors] Unexpected stop_reason="${msg.stop_reason}" for category="${category}"`)
      break
    }

    if (!finalText) {
      console.error(`[vendors] No final text produced for category="${category}"`)
      return []
    }

    // Extract JSON array from the response
    const jsonMatch = finalText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error(`[vendors] No JSON array found for ${category}. Response: ${finalText.slice(0, 200)}`)
      return []
    }

    const rawVendors: AIVendor[] = JSON.parse(jsonMatch[0])

    // Map to VendorSuggestion, injecting Amazon product links for relevant categories
    const amazonLinks = AMAZON_SEARCH_TEMPLATES[category]
    return rawVendors.slice(0, 3).map((v) => {
      const vendor: VendorSuggestion = {
        name: v.name || 'Vendor',
        category: label,
        description: v.description || '',
        priceRange: v.priceRange || '€€',
        rating: typeof v.rating === 'number' ? Math.round(v.rating * 10) / 10 : 4.5,
        reviewCount: typeof v.reviewCount === 'number' ? v.reviewCount : 50,
        tags: [category, style, eventType].filter(Boolean),
        address: v.address || undefined,
        phone: v.phone || undefined,
        website: v.website || undefined,
        whyRecommended: v.whyRecommended || undefined,
        budgetAllocation: typeof v.budgetAllocation === 'number' ? v.budgetAllocation : categoryBudget,
      }

      // Attach Amazon product links for product-heavy categories
      if (isProductCat && amazonLinks) {
        vendor.productLinks = amazonLinks.map((link) => ({
          title: link.title,
          url: `https://www.amazon.it/s?k=${link.keywords}&ref=fentsi`,
          description: link.description,
        }))
      }

      return vendor
    })
  } catch (err) {
    console.error(`[vendors] AI generation failed for ${category}:`, err)
    return []
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(`vendors:${ip}`, RATE_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const categories    = (body.categories as string[]) ?? []
    const eventType     = (body.eventType  as string)  ?? 'wedding'
    const style         = (body.style      as string)  ?? 'elegant'
    const budget        = Number(body.budget)      || 10000
    const guestsCount   = Number(body.guestsCount) || 50
    const locationName  = (body.locationName as string) ?? (body.region as string) ?? 'Italy'

    if (!categories.length) {
      return NextResponse.json({ error: 'No categories specified' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey })

    console.log(`[vendors] AI generating ${categories.length} categories for ${eventType} in ${locationName}`)

    // Generate all categories in parallel
    const results = await Promise.allSettled(
      categories.slice(0, 12).map((cat) =>
        generateCategoryVendors(cat, eventType, style, budget, guestsCount, locationName, anthropic)
          .then((vendors) => ({ category: cat, vendors }))
      )
    )

    const vendorsByCategory: Record<string, VendorSuggestion[]> = {}
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.vendors.length > 0) {
        vendorsByCategory[r.value.category] = r.value.vendors
      }
    })

    const totalFound = Object.values(vendorsByCategory).flat().length
    console.log(`[vendors] Generated ${totalFound} vendors across ${Object.keys(vendorsByCategory).length} categories`)

    return NextResponse.json({
      vendorsByCategory,
      totalFound,
      source: 'ai_generated',
      context: { eventType, style, budget, guestsCount, locationName },
    })
  } catch (err) {
    console.error('[vendors] Route error:', err)
    return NextResponse.json({ error: 'Failed to generate vendors' }, { status: 500 })
  }
}
