import { CreateWizard } from "@/components/wizard/create-wizard";
import { createServerSupabase } from "@/lib/supabase/server";
import type { EventTypePreset } from "@/types/plans";

type EventTypeRow = {
  id: string;
  name: string;
  min_budget: number | null;
  presets: Record<string, unknown> | null;
};

export default async function CreatePage() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("event_types")
    .select("id, name, min_budget, presets")
    .order("name", { ascending: true });

  const rows = (data ?? []) as EventTypeRow[];
  const eventTypes = mapEventTypes(rows);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Impossibile caricare gli event types:", error.message);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Fentsi Wizard</p>
        <h1 className="font-display text-h2 text-slate-900">Pianifica il tuo evento</h1>
        <p className="max-w-2xl text-base text-slate-500">
          Completa i 10 step per generare un piano curato con venue, fornitori e budget ottimizzati. Il recap resta
          sempre visibile e puoi salvare in qualsiasi momento.
        </p>
      </div>
      <CreateWizard eventTypes={eventTypes} />
    </div>
  );
}

function mapEventTypes(rows: EventTypeRow[]): EventTypePreset[] {
  return rows
    .map((row) => {
      const presets = normalizePresets(row.presets);

      return {
        id: row.id,
        name: row.name,
        minBudget: row.min_budget ?? 300,
        guestTiers: presets.guestTiers,
        budgetPresets: presets.budgetPresets,
      };
    })
    .filter((eventType) => Boolean(eventType.id) && Boolean(eventType.name));
}

function normalizePresets(raw: Record<string, unknown> | null): {
  guestTiers: string[];
  budgetPresets: EventTypePreset["budgetPresets"];
} {
  if (!raw) {
    return {
      guestTiers: [],
      budgetPresets: [],
    };
  }

  const guestTiersRaw = Array.isArray(raw["guest_tiers"]) ? raw["guest_tiers"] : [];
  const guestTiers = guestTiersRaw.filter((value): value is string => typeof value === "string");

  const budgetPresetsRaw = Array.isArray(raw["budget_presets"]) ? raw["budget_presets"] : [];
  const budgetPresets = budgetPresetsRaw
    .filter((value): value is number => typeof value === "number" && value > 0)
    .map((value) => ({
      value,
      label: `€ ${value.toLocaleString("it-IT")}`,
    }));

  return {
    guestTiers,
    budgetPresets,
  };
}
