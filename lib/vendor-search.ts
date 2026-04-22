// lib/vendor-search.ts
import Anthropic from '@anthropic-ai/sdk'

interface VendorSearchInput {
  eventType: string
  budget: number
  region: string
  styles: string[]
  priorities: string[]
  services: string[]
  guestsCount: number
  locationDetails: string
}

interface Vendor {
  id: string
  name: string
  category: string
  description: string
  priceRange: [number, number]
  location: string
  rating: number
  link: string
  imageUrl?: string
  matchScore: number
}

interface VendorSearchResult {
  venues: Vendor[]
  catering: Vendor[]
  photography: Vendor[]
  eventPlanner: Vendor[]
  otherServices: Vendor[]
  estimatedBudgetBreakdown: Record<string, number>
}

export async function searchVendors(
  input: VendorSearchInput
): Promise<VendorSearchResult> {
  const client = new Anthropic()

  const prompt = `Generate realistic event vendors for:
  - Event: ${input.eventType}
  - Budget: €${input.budget}
  - Location: ${input.region}
  - Styles: ${input.styles.join(', ')}
  - Services needed: ${input.services.join(', ')}
  - Guests: ${input.guestsCount}
  - Details: ${input.locationDetails}

  Return ONLY a valid JSON object (no markdown, no code blocks) with these exact arrays:
  - venues: array of venue vendors
  - catering: array of catering vendors
  - photography: array of photography vendors
  - eventPlanner: array of event planner vendors
  - otherServices: array of other service vendors

  Each vendor must have: {id, name, category, description, priceRange: [min, max], location, rating, link, matchScore: 0-100}

  Make priceRange realistic in euros. Make matchScore reflect how well they fit the requirements.
  Ensure all arrays exist even if empty.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20250501',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      // Extract JSON from response (handle potential markdown formatting)
      let jsonText = content.text

      // Remove markdown code blocks if present
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1]
      }

      // Try to find JSON object
      const objectMatch = jsonText.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        const parsed = JSON.parse(objectMatch[0])

        return {
          venues: ensureVendorArray(parsed.venues),
          catering: ensureVendorArray(parsed.catering),
          photography: ensureVendorArray(parsed.photography),
          eventPlanner: ensureVendorArray(parsed.eventPlanner),
          otherServices: ensureVendorArray(parsed.otherServices),
          estimatedBudgetBreakdown: calculateBudgetBreakdown(input),
        }
      }
    }
  } catch (error) {
    console.error('Error in searchVendors:', error)
  }

  // Return empty result structure on error
  return {
    venues: [],
    catering: [],
    photography: [],
    eventPlanner: [],
    otherServices: [],
    estimatedBudgetBreakdown: calculateBudgetBreakdown(input),
  }
}

function ensureVendorArray(arr: unknown): Vendor[] {
  if (!Array.isArray(arr)) return []
  return arr.filter(
    (v) =>
      v &&
      typeof v === 'object' &&
      'id' in v &&
      'name' in v &&
      'category' in v
  ) as Vendor[]
}

function calculateBudgetBreakdown(input: VendorSearchInput): Record<string, number> {
  const breakdown: Record<string, number> = {}
  const budget = input.budget

  // Allocate based on priorities
  if (input.priorities.includes('venue')) breakdown.venue = budget * 0.4
  if (input.priorities.includes('food_drinks')) breakdown.catering = budget * 0.3
  if (input.priorities.includes('photography')) breakdown.photography = budget * 0.2
  if (input.priorities.includes('entertainment')) breakdown.entertainment = budget * 0.1

  // Fill remaining budget proportionally
  const allocatedTotal = Object.values(breakdown).reduce((a, b) => a + b, 0)
  if (allocatedTotal < budget) {
    const remaining = budget - allocatedTotal
    breakdown.miscellaneous = remaining
  }

  return breakdown
}
