import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe.server';
import { ONE_TIME_PRODUCTS, type OneTimeProduct } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import env from '@/config/env';

/**
 * Creates a Stripe Checkout Session for one-time add-on products
 * (e.g. Pacchetto Coordinamento).
 *
 * Ported from legacy Fentsi (app/api/checkout/booking/route.ts).
 */

const BodySchema = z.object({
  product: z.enum(['coordination']),
  planId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  }
  const { product, planId } = parsed.data;
  const productKey: OneTimeProduct = product;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const priceId = ONE_TIME_PRODUCTS[productKey].priceId;
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID not configured for product "${product}"` },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        product,
        ...(planId ? { planId } : {}),
      },
      success_url: planId
        ? `${env.appUrl}/event-plan/${planId}?booking=success&session_id={CHECKOUT_SESSION_ID}`
        : `${env.appUrl}/dashboard?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: planId
        ? `${env.appUrl}/event-plan/${planId}?booking=cancelled`
        : `${env.appUrl}/dashboard?booking=cancelled`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
