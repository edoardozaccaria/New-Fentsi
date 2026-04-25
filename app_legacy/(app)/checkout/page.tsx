import { redirect, notFound } from "next/navigation";
import { Calendar, MapPin, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckoutActions } from "@/components/checkout/checkout-actions";
import { createServerSupabase } from "@/lib/supabase/server";

type CheckoutPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const planId = typeof searchParams.plan === "string" ? searchParams.plan : undefined;
  const vendorId = typeof searchParams.vendor === "string" ? searchParams.vendor : undefined;
  const amountParam = typeof searchParams.amount === "string" ? Number(searchParams.amount) : undefined;

  if (!planId || !vendorId) {
    redirect("/my-plans");
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  type PlanRow = Pick<
    import("@/types/supabase").Database["public"]["Tables"]["plans"]["Row"],
    "id" | "created_at" | "total_budget_eur"
  >;

  const { data: _planData, error: planError } = await supabase
    .from("plans")
    .select("id, created_at, total_budget_eur")
    .eq("id", planId)
    .eq("user_id", user.id)
    .maybeSingle();

  const planData = _planData as PlanRow | null;

  if (planError) {
    // eslint-disable-next-line no-console
    console.error("Errore nel recupero del piano:", planError.message);
  }

  if (!planData) {
    notFound();
  }

  type VendorRow = Pick<
    import("@/types/supabase").Database["public"]["Tables"]["vendors"]["Row"],
    "id" | "name" | "type" | "city" | "country" | "price_band" | "direct_partner" | "aggregator"
  >;

  const { data: _vendorData, error: vendorError } = await supabase
    .from("vendors")
    .select("id, name, type, city, country, price_band, direct_partner, aggregator")
    .eq("id", vendorId)
    .maybeSingle();

  const vendorData = _vendorData as VendorRow | null;

  if (vendorError) {
    // eslint-disable-next-line no-console
    console.error("Errore nel recupero del vendor:", vendorError.message);
  }

  if (!vendorData) {
    notFound();
  }

  const { data: vendorMatch } = await supabase
    .from("vendor_matches")
    .select("vendor_id")
    .eq("plan_id", planId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (!vendorMatch) {
    notFound();
  }

  const totalBudget = planData.total_budget_eur ? Number(planData.total_budget_eur) : null;
  const suggestedAmount =
    typeof amountParam === "number" && Number.isFinite(amountParam) && amountParam > 0
      ? Math.round(amountParam)
      : totalBudget && Number.isFinite(totalBudget)
        ? Math.max(500, Math.round((totalBudget * 0.2) / 100) * 100)
        : 500;

  const vendorLocation = [vendorData.city, vendorData.country].filter(Boolean).join(", ") || "Località su richiesta";
  const createdAt = planData.created_at ? new Date(planData.created_at) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Checkout</p>
        <h1 className="font-display text-h2 text-slate-900">Deposito — {vendorData.name}</h1>
        <p className="text-base text-slate-500">
          Completa il deposito per bloccare la disponibilità di {vendorData.name} e attivare il supporto concierge Fentsi.
        </p>
      </div>

      <Card className="border-slate-100">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {createdAt && (
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Piano creato il{" "}
                {createdAt.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {vendorLocation}
            </span>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Deposito iniziale suggerito</span>
              <span className="text-lg font-semibold text-slate-900">{formatCurrency(suggestedAmount)}</span>
            </div>
            {totalBudget && (
              <div className="flex items-center justify-between">
                <span>Budget piano</span>
                <span>{formatCurrency(totalBudget)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Commissione Fentsi (inclusa)</span>
              <span>€ 0</span>
            </div>
          </div>
          <Badge variant="outline" className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4" /> Pagamento gestito in modo sicuro tramite Stripe Checkout
          </Badge>
        </CardContent>
      </Card>

      <CheckoutActions
        planId={planId}
        vendorId={vendorId}
        vendorName={vendorData.name}
        defaultAmount={suggestedAmount}
        currency="eur"
      />
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
