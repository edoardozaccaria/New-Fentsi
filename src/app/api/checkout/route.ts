import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe.server';
import { PLANS, type PlanType } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import env from '@/config/env';

/**
 * Creates a Stripe Checkout Session for a subscription plan.
 *
 * Ported from legacy Fentsi (app/api/checkout/route.ts).
 * Adaptations: uses `createSupabaseServerClient()` (async) + `@/config/env`.
 */

const BodySchema = z.object({
  plan: z.enum(['single', 'pro', 'agency']),
});

export async function POST(request: NextRequest) {
  // Parse and validate body
  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  const plan = parsed.data.plan as PlanType;

  // Require authenticated user
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const priceId = PLANS[plan].priceId;
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID not configured for plan "${plan}"` },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      success_url: `${env.appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/dashboard?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
