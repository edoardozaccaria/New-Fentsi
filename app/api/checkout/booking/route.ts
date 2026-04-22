/**
 * POST /api/checkout/booking
 *
 * Creates a Stripe one-time payment session for the Fentsi Coordination Package.
 * The user pays €99 and Fentsi's team handles all vendor negotiation/booking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { BookingCheckoutSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const COORDINATION_FEE_CENTS = 9900 // €99.00
const RATE_LIMIT = { limit: 10, windowSeconds: 600 }

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(`checkout-booking:${ip}`, RATE_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const parseResult = BookingCheckoutSchema.safeParse(await req.json())
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: parseResult.error.flatten().fieldErrors }, { status: 400 })
    }
    const { vendors, eventTitle, email, name, message } = parseResult.data

    // Use env var only — never trust Host header (SSRF protection)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    if (!appUrl) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // Build a readable description of the selected vendors
    const vendorList = vendors
      .map((v) => `${v.category}: ${v.name}`)
      .join(', ')

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: COORDINATION_FEE_CENTS,
            product_data: {
              name: 'Fentsi Coordination Package',
              description: `Gestione completa prenotazioni per: ${vendorList.slice(0, 200)}`,
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        eventTitle: eventTitle?.slice(0, 500) ?? '',
        customerName: name?.slice(0, 200) ?? '',
        customerEmail: email,
        vendorCount: String(vendors.length),
        vendorList: vendorList.slice(0, 500),
        message: message?.slice(0, 500) ?? '',
      },
      success_url: `${appUrl}/dashboard?booking=success`,
      cancel_url:  `${appUrl}/dashboard?booking=canceled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[checkout/booking] Stripe error:', error)
    return NextResponse.json({ error: 'Checkout failed. Please try again.' }, { status: 500 })
  }
}
