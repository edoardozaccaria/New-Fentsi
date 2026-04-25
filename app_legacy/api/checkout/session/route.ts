import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createRouteSupabase } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validators/plan";

export async function POST(request: Request) {
  const supabase = createRouteSupabase();
  const stripe = getStripe();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { planId, vendorId, amount, currency, successUrl, cancelUrl } = parsed.data;

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
  }

  const { data: vendorMatch, error: matchError } = await supabase
    .from("vendor_matches")
    .select("vendor_id")
    .eq("plan_id", planId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  if (!vendorMatch) {
    return NextResponse.json({ error: "Vendor non collegato al piano" }, { status: 400 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      metadata: {
        planId,
        vendorId,
        userId: user.id,
      },
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: "Fentsi booking deposit",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // TODO: add Relationships to types/supabase.ts to remove this cast
  // (supabase-js v2.44 type inference regression on tables without FK Relationships)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error: bookingError } = await db.from("bookings").insert({
    plan_id: planId,
    vendor_id: vendorId,
    amount_eur: amount,
    stripe_session_id: session.id,
    status: "initiated",
  });

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id, url: session.url });
}
