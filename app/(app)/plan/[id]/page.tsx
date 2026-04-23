import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestTierById } from "@/lib/data/guest-tiers";
import type { AllocationCategory } from "@/types/plans";

type PlanParams = {
  params: {
    id: string;
  };
};

type PlanRecord = {
  id: string;
  created_at: string;
  status: "draft" | "generated" | "booked";
  total_budget_eur: number | null;
  guests_tier: string | null;
  event_type: {
    name: string;
  } | null;
  plan_allocations: {
    category: AllocationCategory;
    percent: number;
    amount_eur: number | null;
  }[];
  plan_choices: {
    venue_style: string | null;
    catering_styles: string[] | null;
    decor_mood: string | null;
    extras: string[] | null;
  }[];
  plan_brief_assets: {
    id: string;
    asset_type: "image" | "link" | "doc";
    title: string | null;
    url: string;
  }[];
};

type VendorMatchRecord = {
  rank: number | null;
  reason: string | null;
  direct_partner: boolean | null;
  vendor: {
    id: string;
    name: string;
    type: string;
    city: string | null;
    country: string | null;
    price_band: string | null;
    direct_partner: boolean;
    aggregator: boolean;
    aggregator_source: string | null;
  } | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default async function PlanDetailPage({ params }: PlanParams) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: planData, error: planError } = await supabase
    .from("plans")
    .select(
      "id, created_at, status, total_budget_eur, guests_tier, event_type:event_type_id(name), plan_allocations(category, percent, amount_eur), plan_choices(venue_style, catering_styles, decor_mood, extras), plan_brief_assets(id, asset_type, title, url)",
    )
    .eq("user_id", user.id)
    .eq("id", params.id)
    .maybeSingle();

  if (planError) {
    // eslint-disable-next-line no-console
    console.error("Errore nel recupero del piano:", planError.message);
  }

  if (!planData) {
    notFound();
  }

  const plan = planData as PlanRecord;
  const totalBudgetValue = plan.total_budget_eur ? Number(plan.total_budget_eur) : null;
  const depositSuggested =
    totalBudgetValue && Number.isFinite(totalBudgetValue)
      ? Math.max(500, Math.round((totalBudgetValue * 0.2) / 100) * 100)
      : 500;
  const allocations = [...(plan.plan_allocations ?? [])].sort((a, b) => b.percent - a.percent);
  const choices = plan.plan_choices?.[0];

  const { data: matchesData, error: matchesError } = await supabase
    .from("vendor_matches")
    .select(
      "rank, reason, direct_partner, vendor:vendor_id(id, name, type, city, country, price_band, direct_partner, aggregator, aggregator_source)",
    )
    .eq("plan_id", params.id)
    .order("rank", { ascending: false });

  if (matchesError) {
    // eslint-disable-next-line no-console
    console.error("Errore nel recupero dei vendor:", matchesError.message);
  }

  const vendorMatches = (matchesData ?? []) as VendorMatchRecord[];
  const directPartners = vendorMatches.filter((match) => match.vendor?.direct_partner);
  const aggregators = vendorMatches.filter((match) => match.vendor?.aggregator && !match.vendor.direct_partner);
  const otherVendors = vendorMatches.filter(
    (match) => match.vendor && !match.vendor.direct_partner && !match.vendor.aggregator,
  );

  const defaultVendorId = vendorMatches[0]?.vendor?.id ?? null;

  const title = plan.event_type?.name ?? "Piano evento";
  const guestTier = plan.guests_tier ? getGuestTierById(plan.guests_tier)?.label : undefined;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Event plan</p>
          <h1 className="font-display text-h2 text-slate-900">{title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {DATE_FORMAT.format(new Date(plan.created_at))}
            </span>
            {guestTier && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Guest tier {guestTier}
              </span>
            )}
            {plan.total_budget_eur && (
              <Badge variant="outline">Budget {formatCurrency(plan.total_budget_eur)}</Badge>
            )}
          </div>
        </header>

        <Card className="border-slate-100">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="font-display text-h3 text-slate-900">Allocazione budget</h2>
              <ul className="space-y-2 text-sm text-slate-500">
                {allocations.length === 0 && <li>Nessuna allocazione salvata.</li>}
                {allocations.map((allocation) => (
                  <li key={allocation.category} className="flex items-center justify-between">
                    <span className="capitalize text-slate-600">{formatCategory(allocation.category)}</span>
                    <span className="font-semibold text-slate-900">
                      {allocation.percent}%{" "}
                      {allocation.amount_eur ? `· ${formatCurrency(allocation.amount_eur)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Creative brief</p>
              {choices?.decor_mood ? <p className="mt-2 capitalize">{choices.decor_mood}</p> : <p>Nessun mood indicato.</p>}
              {choices?.catering_styles?.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  Catering: {choices.catering_styles.map((item) => item.replace(/_/g, " ")).join(", ")}
                </p>
              ) : null}
              {choices?.extras?.length ? (
                <p className="mt-1 text-xs text-slate-500">
                  Extra: {choices.extras.map((item) => item.replace(/_/g, " ")).join(", ")}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Section title="✨ Fentsi Partner" badge={{ label: "Priority", variant: "partner" }}>
          {directPartners.length === 0 ? (
            <EmptyVendors message="Nessun partner diretto è stato assegnato a questo piano." />
          ) : (
            directPartners.map((match) => (
              <VendorCard key={match.vendor?.id} match={match} planId={plan.id} depositAmount={depositSuggested} />
            ))
          )}
        </Section>

        <Section title="Aggregatori consigliati" badge={{ label: "Aggregator", variant: "outline" }}>
          {aggregators.length === 0 ? (
            <EmptyVendors message="Non sono presenti aggregatori per questo piano." />
          ) : (
            aggregators.map((match) => (
              <VendorCard key={match.vendor?.id} match={match} planId={plan.id} depositAmount={depositSuggested} />
            ))
          )}
        </Section>

        <Section title="Altri suggerimenti">
          {otherVendors.length === 0 ? (
            <EmptyVendors message="Genera nuovamente il piano per vedere più suggerimenti personalizzati." />
          ) : (
            otherVendors.map((match) => (
              <VendorCard key={match.vendor?.id} match={match} planId={plan.id} depositAmount={depositSuggested} />
            ))
          )}
        </Section>

        <section className="space-y-4">
          <h2 className="font-display text-h3 text-slate-900">Asset caricati</h2>
          <Card className="border-slate-100">
            <CardContent className="space-y-3 p-6">
              {plan.plan_brief_assets.length === 0 && (
                <p className="text-sm text-slate-500">Aggiungi moodboard o reference per arricchire il briefing.</p>
              )}
              {plan.plan_brief_assets.length > 0 && (
                <ul className="space-y-2 text-sm text-slate-600">
                  {plan.plan_brief_assets.map((asset) => (
                    <li key={asset.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{asset.title ?? asset.asset_type}</p>
                        <p className="text-xs text-slate-400">{asset.asset_type.toUpperCase()}</p>
                      </div>
                      <Button variant="ghost" asChild size="sm">
                        <Link href={asset.url} target="_blank" rel="noopener noreferrer">
                          Apri
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <aside className="hidden space-y-4 lg:block">
        <Card className="border-slate-100">
          <CardContent className="space-y-4 p-6">
            <h3 className="font-display text-lg text-slate-900">Prenota con Fentsi</h3>
            <p className="text-sm text-slate-500">
              Blocca la disponibilità dei fornitori preferiti con supporto concierge e condizioni dedicate ai clienti
              Fentsi.
            </p>
            {defaultVendorId ? (
              <Button className="w-full shadow-soft" asChild>
                <Link href={`/checkout?plan=${plan.id}&vendor=${defaultVendorId}`}>Avvia checkout</Link>
              </Button>
            ) : (
              <Button className="w-full shadow-soft" disabled>
                Seleziona un vendor
              </Button>
            )}
            <Button variant="ghost" className="w-full" asChild>
              <Link href="mailto:concierge@fentsi.com">Parla con un concierge</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="space-y-3 p-6 text-sm text-slate-500">
            <h4 className="font-display text-base text-slate-900">Stato piano</h4>
            <p>
              Stato attuale: <span className="font-medium text-slate-900">{formatStatus(plan.status)}</span>
            </p>
            <Separator />
            <p className="text-xs text-slate-400">
              Ultimo aggiornamento {DATE_FORMAT.format(new Date(plan.created_at))}. Aggiorna le allocazioni o rigenera il
              piano dal wizard per ottenere nuovi suggerimenti.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: { label: string; variant: "partner" | "outline" | "accent" };
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-h3 text-slate-900">{title}</h2>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function VendorCard({
  match,
  planId,
  depositAmount,
}: {
  match: VendorMatchRecord;
  planId: string;
  depositAmount: number;
}) {
  if (!match.vendor) return null;
  const { vendor } = match;
  const price = vendor.price_band ?? "€€";
  const location = [vendor.city, vendor.country].filter(Boolean).join(", ");
  const isAggregator = vendor.aggregator && !vendor.direct_partner;
  const referralKind: "direct" | "aggregator" = isAggregator ? "aggregator" : "direct";
  const depositParam = Math.max(1, Math.round(depositAmount));

  const checkoutHref = `/checkout?plan=${planId}&vendor=${vendor.id}&amount=${depositParam}`;

  const visitRedirect =
    isAggregator && vendor.aggregator_source ? vendor.aggregator_source : `/plan/${planId}`;

  const referralMetadata = {
    vendorName: vendor.name,
    vendorType: vendor.type,
    matchReason: match.reason,
  };

  const referralHref = buildReferralUrl({
    planId,
    vendorId: vendor.id,
    kind: referralKind,
    redirect: visitRedirect,
    metadata: referralMetadata,
  });

  const contactMail = `mailto:concierge@fentsi.com?subject=${encodeURIComponent(`Richiesta ${vendor.name}`)}`;

  return (
    <Card className="border-slate-100">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-slate-900">{vendor.name}</h3>
            <p className="text-sm text-slate-500">
              {vendor.type} {location ? `· ${location}` : ""} · {price}
            </p>
          </div>
          {vendor.direct_partner ? (
            <Badge variant="accent">Fentsi Partner</Badge>
          ) : vendor.aggregator ? (
            <Badge variant="outline">Aggregator</Badge>
          ) : null}
        </div>
        {match.reason && <p className="text-sm text-slate-600">{match.reason}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {!isAggregator && (
            <Button asChild className="shadow-soft">
              <Link href={checkoutHref}>Prenota</Link>
            </Button>
          )}
          {isAggregator && (
            <Button variant="ghost" asChild>
              <Link
                href={referralHref}
                target={vendor.aggregator_source ? "_blank" : undefined}
                rel={vendor.aggregator_source ? "noopener noreferrer" : undefined}
                prefetch={false}
              >
                Visita
              </Link>
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link href={contactMail}>Contatta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyVendors({ message }: { message: string }) {
  return (
    <Card className="border-dashed border-slate-200 bg-slate-50/60">
      <CardContent className="p-6 text-sm text-slate-500">{message}</CardContent>
    </Card>
  );
}

function buildReferralUrl({
  planId,
  vendorId,
  kind,
  redirect,
  metadata,
}: {
  planId: string;
  vendorId?: string;
  kind: "direct" | "aggregator" | "affiliate";
  redirect?: string;
  metadata?: Record<string, unknown>;
}) {
  const params = new URLSearchParams();
  params.set("planId", planId);
  params.set("kind", kind);
  if (vendorId) params.set("vendorId", vendorId);
  if (redirect) params.set("redirect", redirect);
  if (metadata && Object.keys(metadata).length > 0) {
    params.set("metadata", JSON.stringify(metadata));
  }
  return `/api/referral/click?${params.toString()}`;
}

function formatCurrency(value: number) {
  return `€ ${value.toLocaleString("it-IT")}`;
}

function formatCategory(category: AllocationCategory) {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status: PlanRecord["status"]) {
  switch (status) {
    case "draft":
      return "Bozza";
    case "generated":
      return "Generato";
    case "booked":
      return "Prenotato";
    default:
      return status;
  }
}
