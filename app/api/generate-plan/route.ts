/**
 * POST /api/generate-plan
 *
 * Pipeline:
 * 1. Validate & sanitize OnboardingData from wizard
 * 2. Rate limit by IP (5 plans per hour)
 * 3. If lat/lng available → fetch real vendors from Foursquare (/api/vendors)
 * 4. Pass real vendors to Claude → generate personalised event plan
 * 5. Save to Supabase (if configured), linking to authenticated user
 * 6. Return { plan, eventId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateEventPlan, getMockPlan } from '@/lib/ai'
import { createServerSupabase } from '@/lib/supabase'
import { getServerUser } from '@/lib/supabase-server'
import { VendorSuggestion } from '@/types/event'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { OnboardingDataSchema } from '@/lib/validation'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'

// Rate limit: 5 plan generations per IP per 10 minutes
const RATE_LIMIT = { limit: 5, windowSeconds: 600 }

// ── Categories to search based on selected services ───────────────────────────
const SERVICE_TO_CATEGORY: Record<string, string> = {
  catering:        'catering',
  photography:     'photography',
  video:           'video',
  dj_music:        'music',
  flowers_decor:   'flowers_decor',
  wedding_cake:    'wedding_cake',
  wedding_planner: 'wedding_planner',
  transport:       'transport',
  entertainment:   'entertainment',
  lighting:        'lighting',
}

// ── Fetch AI-generated vendors from /api/vendors route ────────────────────────
async function fetchRealVendors(
  data: { locationLat: number | null; locationLng: number | null; region?: string | null; services: string[]; eventType?: string | null; styles?: string[]; budget?: number; guestsCount?: number },
  baseUrl: string
): Promise<Record<string, VendorSuggestion[]>> {
  if (!process.env.ANTHROPIC_API_KEY) return {}

  const categories = Array.from(
    new Set(['venue', ...data.services.map((s: string) => SERVICE_TO_CATEGORY[s]).filter(Boolean)])
  )

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 50000) // 50s for AI generation

  try {
    const res = await fetch(`${baseUrl}/api/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories,
        eventType:    data.eventType,
        style:        data.styles?.[0] ?? '',
        budget:       data.budget,
        guestsCount:  data.guestsCount,
        locationName: data.region ?? 'Italy',
      }),
      signal: controller.signal,
    })

    if (!res.ok) return {}
    const json = await res.json()
    return json.vendorsByCategory ?? {}
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[generate-plan] Vendor fetch timed out')
    } else {
      console.error('[generate-plan] Vendor fetch error:', err)
    }
    return {}
  } finally {
    clearTimeout(timeout)
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`generate-plan:${ip}`, RATE_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  try {
    // ── Input validation (prevents prompt injection + malformed data) ───────
    const raw = await req.json()
    const parseResult = OnboardingDataSchema.safeParse(raw)
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors
      return NextResponse.json({ error: 'Invalid input', details: errors }, { status: 400 })
    }
    const data = parseResult.data

    // Use env var only — never trust Host/Origin headers (SSRF protection)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    if (!baseUrl) {
      console.error('[generate-plan] NEXT_PUBLIC_APP_URL not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // Step 1: Fetch real local vendors
    let realVendors: Record<string, VendorSuggestion[]> = {}
    const hasLocation = !!(data.locationLat && data.locationLng)

    if (process.env.ANTHROPIC_API_KEY) {
      console.log(`[generate-plan] Generating AI vendors for ${data.region ?? 'Italy'}`)
      realVendors = await fetchRealVendors(data, baseUrl)
      console.log(`[generate-plan] Generated vendors in ${Object.keys(realVendors).length} categories`)
    }

    // Step 2: Generate plan with Claude
    let plan
    if (process.env.ANTHROPIC_API_KEY) {
      plan = await generateEventPlan(data, realVendors)
    } else {
      console.warn('[generate-plan] No ANTHROPIC_API_KEY — using mock plan')
      plan = getMockPlan(data)
    }

    // Step 3: Save to Supabase
    let eventId = plan.id ?? crypto.randomUUID()
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createServerSupabase()

        // Try to get current user to link the event
        let userId: string | null = null
        try {
          const user = await getServerUser()
          userId = user?.id ?? null
        } catch {
          // No auth session — event will be anonymous
        }

        const { data: event, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            data: data as unknown as Record<string, unknown>,
            plan: plan as unknown as Record<string, unknown>,
            status: 'completed' as const,
          } as never)
          .select('id')
          .single()

        if (!error && event) {
          eventId = (event as { id: string }).id
          console.log(`[generate-plan] Event saved: ${eventId} (user: ${userId ?? 'anonymous'})`)
        } else if (error) {
          console.error('[generate-plan] Supabase insert error:', error.message)
        }
      } catch (err) {
        console.error('[generate-plan] Supabase connection error:', err)
      }
    }

    return NextResponse.json({
      plan,
      eventId,
      meta: {
        vendorsFromFoursquare: plan.vendorsFromGooglePlaces ?? false,
        vendorCategoriesSearched: Object.keys(realVendors).length,
        locationPinned: hasLocation,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten().fieldErrors }, { status: 400 })
    }
    console.error('[generate-plan] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to generate plan. Please try again.' }, { status: 500 })
  }
}
