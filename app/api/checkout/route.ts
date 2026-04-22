import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PLANS } from '@/lib/stripe'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { CheckoutSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const RATE_LIMIT = { limit: 10, windowSeconds: 600 }

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(`checkout:${ip}`, RATE_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const parseResult = CheckoutSchema.safeParse(await req.json())
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: parseResult.error.flatten().fieldErrors }, { status: 400 })
    }
    const { planType, email } = parseResult.data
    const plan = PLANS[planType]

    if (!plan.priceId) {
      return NextResponse.json({ error: 'Free plan does not require checkout' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 503 })
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      `https://${req.headers.get('host')}`

    // Use 'payment' mode for one-time purchases, 'subscription' for recurring
    const mode = plan.oneTime ? 'payment' : 'subscription'

    const session = await getStripe().checkout.sessions.create({
      mode,
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
      metadata: { planType },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed. Please try again.' }, { status: 500 })
  }
}
