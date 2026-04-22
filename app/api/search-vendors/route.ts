// app/api/search-vendors/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchVendors } from '@/lib/vendor-search'
import type { OnboardingData } from '@/types/event'

export const dynamic = 'force-dynamic'

/**
 * POST /api/search-vendors
 *
 * AI-powered vendor search using Claude Haiku
 *
 * Request body:
 * {
 *   eventType: string,
 *   budget: number,
 *   region: string,
 *   styles: string[],
 *   priorities: string[],
 *   services: string[],
 *   guestsCount: number,
 *   locationDetails: string
 * }
 *
 * Response: VendorSearchResult with categorized vendors and budget breakdown
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    const requiredFields = [
      'eventType',
      'budget',
      'region',
      'styles',
      'services',
      'guestsCount',
    ]
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    console.log(`[search-vendors] Searching vendors for ${body.eventType} in ${body.region}`)

    const result = await searchVendors({
      eventType: body.eventType,
      budget: body.budget,
      region: body.region,
      styles: body.styles || [],
      priorities: body.priorities || [],
      services: body.services || [],
      guestsCount: body.guestsCount,
      locationDetails: body.locationDetails || '',
    })

    console.log(
      `[search-vendors] Found vendors: ${result.venues.length} venues, ${result.catering.length} catering`
    )

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        searchMethod: 'claude-haiku',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[search-vendors] Error:', error)
    return NextResponse.json(
      { error: 'Failed to search vendors' },
      { status: 500 }
    )
  }
}
