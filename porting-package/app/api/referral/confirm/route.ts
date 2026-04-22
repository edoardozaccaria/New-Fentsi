import { NextResponse } from "next/server";

import { createRouteSupabase } from "@/lib/supabase/server";
import { referralConfirmSchema } from "@/lib/validators/plan";

export async function POST(request: Request) {
  const supabase = createRouteSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = referralConfirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { referralId, planId, vendorId, commission } = parsed.data;

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {
    conversion_ts: new Date().toISOString(),
    commission_eur: commission ?? null,
  };

  if (vendorId) {
    updatePayload.vendor_id = vendorId;
  }

  let targetId = referralId;

  if (!targetId) {
    const { data: existing, error: existingError } = await supabase
      .from("referrals")
      .select("id")
      .eq("plan_id", planId)
      .eq("vendor_id", vendorId ?? null)
      .is("conversion_ts", null)
      .order("click_ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    targetId = existing?.id;
  }

  if (targetId) {
    const { data: updated, error: updateError } = await supabase
      .from("referrals")
      .update(updatePayload)
      .eq("id", targetId)
      .eq("plan_id", planId)
      .select("id")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Impossibile aggiornare il referral" },
        { status: 500 },
      );
    }

    return NextResponse.json({ referralId: updated.id });
  }

  const { data: created, error: insertError } = await supabase
    .from("referrals")
    .insert({
      plan_id: planId,
      vendor_id: vendorId ?? null,
      kind: "direct",
      conversion_ts: updatePayload.conversion_ts as string,
      commission_eur: commission ?? null,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return NextResponse.json(
      { error: insertError?.message ?? "Impossibile registrare la conversione" },
      { status: 500 },
    );
  }

  return NextResponse.json({ referralId: created.id });
}
