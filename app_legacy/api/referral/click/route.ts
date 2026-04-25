import { NextRequest, NextResponse } from "next/server";

import { createRouteSupabase } from "@/lib/supabase/server";
import { referralClickSchema } from "@/lib/validators/plan";

async function handleReferral({
  planId,
  vendorId,
  kind,
  metadata,
  supabase,
}: {
  planId: string;
  vendorId?: string;
  kind: "direct" | "aggregator" | "affiliate";
  metadata?: Record<string, unknown>;
  supabase: ReturnType<typeof createRouteSupabase>;
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
  }

  if (vendorId) {
    const { data: match, error: matchError } = await supabase
      .from("vendor_matches")
      .select("vendor_id")
      .eq("plan_id", planId)
      .eq("vendor_id", vendorId)
      .maybeSingle();

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    if (!match) {
      return NextResponse.json({ error: "Vendor non collegato al piano" }, { status: 400 });
    }
  }

  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("referrals")
    .insert({
      plan_id: planId,
      vendor_id: vendorId ?? null,
      kind,
      click_ts: now,
      payload: metadata ?? null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Impossibile registrare il referral" },
      { status: 500 },
    );
  }

  return NextResponse.json({ referralId: inserted.id });
}

function parseMetadata(value: string | null) {
  if (!value) return undefined;
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const query = {
    planId: url.searchParams.get("planId") ?? "",
    vendorId: url.searchParams.get("vendorId") ?? undefined,
    kind: (url.searchParams.get("kind") ?? "direct") as "direct" | "aggregator" | "affiliate",
    metadata: parseMetadata(url.searchParams.get("metadata")),
  };

  const parsed = referralClickSchema.safeParse(query);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createRouteSupabase();
  const response = await handleReferral({ ...parsed.data, supabase });
  if (response.status !== 200) {
    return response;
  }

  const redirectTarget = url.searchParams.get("redirect");
  if (redirectTarget) {
    try {
      const redirectUrl = new URL(redirectTarget, url.origin);
      return NextResponse.redirect(redirectUrl);
    } catch {
      // fallthrough to JSON response
    }
  }

  return response;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = referralClickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createRouteSupabase();
  return handleReferral({ ...parsed.data, supabase });
}
