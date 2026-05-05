import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { planUpsertSchema } from '@/lib/validators/plan';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// POST /api/plans
// Upserts a wizard draft plan step by step.
// Returns { planId: string }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 });
  }

  const parsed = planUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    planId,
    eventTypeId,
    guestTierId,
    totalBudget,
    allocations,
    choices,
    brief,
    consent,
    locale,
  } = parsed.data;

  // ── Upsert plans row ──────────────────────────────────────────────────────

  let resolvedPlanId: string;

  if (planId) {
    // Verify ownership before updating
    const { data: existing } = await supabase
      .from('plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Piano non trovato' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('plans')
      .update({
        ...(eventTypeId !== undefined && { event_type_id: eventTypeId }),
        ...(guestTierId !== undefined && { guests_tier: guestTierId }),
        ...(totalBudget !== undefined && { total_budget_eur: totalBudget }),
        ...(locale !== undefined && { locale }),
        ...(consent === true && { consent_at: new Date().toISOString() }),
      })
      .eq('id', planId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    resolvedPlanId = planId;
  } else {
    const { data: newPlan, error: insertError } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        event_type_id: eventTypeId ?? null,
        guests_tier: guestTierId ?? null,
        total_budget_eur: totalBudget ?? null,
        locale: locale ?? 'it',
        status: 'draft',
        ...(consent === true && { consent_at: new Date().toISOString() }),
      })
      .select('id')
      .single();

    if (insertError || !newPlan) {
      return NextResponse.json(
        { error: insertError?.message ?? 'Errore creazione piano' },
        { status: 500 }
      );
    }

    resolvedPlanId = newPlan.id;
  }

  // ── Upsert plan_allocations ────────────────────────────────────────────────

  if (allocations) {
    // Delete existing rows for this plan then re-insert
    await supabase.from('plan_allocations').delete().eq('plan_id', resolvedPlanId);

    const allocationRows = (
      Object.entries(allocations) as [string, number][]
    ).map(([category, percent]) => ({
      plan_id: resolvedPlanId,
      category: category as
        | 'venue'
        | 'catering'
        | 'decor'
        | 'entertainment'
        | 'av'
        | 'photo_video'
        | 'misc',
      percent,
      amount_eur:
        totalBudget != null ? Math.round((totalBudget * percent) / 100) : null,
    }));

    if (allocationRows.length > 0) {
      const { error: allocError } = await supabase
        .from('plan_allocations')
        .insert(allocationRows);
      if (allocError) {
        console.error('[/api/plans] plan_allocations insert error:', allocError.message);
      }
    }
  }

  // ── Upsert plan_choices ────────────────────────────────────────────────────

  if (choices) {
    const { data: existingChoices } = await supabase
      .from('plan_choices')
      .select('id')
      .eq('plan_id', resolvedPlanId)
      .maybeSingle();

    const choicesPayload = {
      venue_style: choices.venueStyle ?? null,
      catering_styles: choices.cateringStyles ?? null,
      decor_mood: choices.decorMood ?? null,
      extras: choices.extras ?? null,
    };

    if (existingChoices) {
      await supabase
        .from('plan_choices')
        .update(choicesPayload)
        .eq('plan_id', resolvedPlanId);
    } else {
      await supabase
        .from('plan_choices')
        .insert({ plan_id: resolvedPlanId, ...choicesPayload });
    }
  }

  // ── Store brief description ────────────────────────────────────────────────
  // We use a sentinel URL ('text:brief') so the row is identifiable.
  // The description text itself is stored in the `title` column.

  if (brief?.description) {
    const { data: existingBrief } = await supabase
      .from('plan_brief_assets')
      .select('id')
      .eq('plan_id', resolvedPlanId)
      .eq('url', 'text:brief')
      .maybeSingle();

    if (existingBrief) {
      await supabase
        .from('plan_brief_assets')
        .update({ title: brief.description })
        .eq('id', existingBrief.id);
    } else {
      await supabase.from('plan_brief_assets').insert({
        plan_id: resolvedPlanId,
        asset_type: 'doc',
        url: 'text:brief',
        title: brief.description,
      });
    }
  }

  return NextResponse.json({ planId: resolvedPlanId });
}
