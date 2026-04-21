import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe.server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Stripe webhook handler.
 *
 * IMPORTANT: proxy.ts excludes `api/stripe/webhook` from auth checks because
 * Stripe signs requests and the user session is not relevant here.
 *
 * Configure in Stripe Dashboard:
 *   Event types: checkout.session.completed, customer.subscription.updated,
 *                customer.subscription.deleted, invoice.payment_succeeded
 *   Endpoint:   https://<your-domain>/api/stripe/webhook
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    );
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Service-role client so we can write regardless of RLS.
  const db = createSupabaseServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as
          | 'single'
          | 'pro'
          | 'agency'
          | undefined;
        if (userId && plan) {
          await db
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_tier: plan,
              stripe_customer_id:
                typeof session.customer === 'string'
                  ? session.customer
                  : (session.customer?.id ?? null),
            })
            .eq('id', userId);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const status =
          event.type === 'customer.subscription.deleted'
            ? 'canceled'
            : sub.status;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await db
          .from('profiles')
          .update({ subscription_status: status })
          .eq('stripe_customer_id', customerId);
        break;
      }
      default:
        // Other events are accepted but ignored.
        break;
    }
  } catch (err) {
    // Log but still return 200 so Stripe does not retry forever on app-layer errors.
    console.error('[stripe webhook] handler error', err);
  }

  return NextResponse.json({ received: true });
}
