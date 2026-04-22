"use client";

import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics/events";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/wizard/stepper";
import { StepHeader } from "@/components/wizard/step-header";
import { StickyRecap } from "@/components/wizard/sticky-recap";
import { decorMoods, extrasOptions, venueStyles, cateringStyles } from "@/lib/data/wizard-options";
import { getBudgetPresets, getEventTypes, getAvailableGuestTiers, getEventTypeById, usePlanWizard } from "@/stores/plan-wizard";
import { wizardSteps, TOTAL_STEPS } from "@/lib/wizard/steps";
import { clamp, getRemainingBudgetPercent, MIN_BUDGET } from "@/lib/wizard/budget";
import type { AllocationCategory, EventTypePreset, PlanBriefAsset } from "@/types/plans";

const allocationOrder: AllocationCategory[] = ["venue", "catering", "decor", "entertainment", "av", "photo_video", "misc"];

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);
}

export function CreateWizard({ eventTypes }: { eventTypes: EventTypePreset[] }) {
  const {
    currentStep,
    draft,
    goToStep,
    nextStep,
    prevStep,
    setEventType,
    setGuestTier,
    setBudget,
    setAllocation,
    toggleAutoRebalance,
    updateChoices,
    updateBrief,
    setConsent,
    setPlanId,
    setEventTypes,
  } = usePlanWizard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEventTypes(eventTypes);
  }, [eventTypes, setEventTypes]);

  const remainingPercent = getRemainingBudgetPercent(draft.allocations);

  const persistPlan = async (stepOverride?: number) => {
    const payload = {
      planId: draft.id,
      eventTypeId: draft.eventTypeId,
      guestTierId: draft.guestTierId,
      totalBudget: draft.totalBudget,
      allocations: draft.allocations,
      choices: draft.choices,
      brief: draft.brief,
      consent: draft.consent,
      locale: draft.locale,
      lastStepCompleted: stepOverride ?? currentStep,
    };

    setIsSaving(true);
    const response = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setIsSaving(false);
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody?.error ?? "Impossibile salvare il piano");
    }

    const data = await response.json();
    if (data.planId) {
      setPlanId(data.planId);
    }
    setIsSaving(false);
    return data.planId as string;
  };

  const handleStepSelect = (step: number) => {
    const allowedStep = Math.min(step, draft.lastStepCompleted + 1);
    goToStep(allowedStep);
  };

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(draft.eventTypeId);
      case 2:
        return Boolean(draft.guestTierId);
      case 3:
        return Boolean(draft.totalBudget && draft.totalBudget >= MIN_BUDGET);
      case 4:
        return Boolean(draft.choices.venueStyle);
      case 5:
        return Boolean(draft.choices.cateringStyles?.length);
      case 6:
        return Boolean(draft.choices.decorMood);
      case 7:
        return Boolean(draft.choices.extras?.length);
      case 8:
        return remainingPercent >= 0;
      case 9:
        return Boolean(draft.brief.description.trim().length >= 20);
      case 10:
        return draft.consent;
      default:
        return true;
    }
  }, [currentStep, draft, remainingPercent]);

  const handleContinue = async () => {
    if (!canContinue) {
      toast({
        title: "Completa lo step",
        description: "Rivedi i campi richiesti prima di proseguire.",
        variant: "error",
      });
      return;
    }
    try {
      await persistPlan(currentStep);
      if (currentStep < TOTAL_STEPS) {
        nextStep();
        trackEvent({ name: "step_viewed", payload: { step: currentStep + 1, planId: draft.id } });
      }
    } catch (error) {
      toast({
        title: "Salvataggio non riuscito",
        description: error instanceof Error ? error.message : "Riprova più tardi.",
        variant: "error",
      });
    }
  };

  const handleBack = () => {
    if (currentStep === 1) return;
    prevStep();
  };

  const handleGenerate = async () => {
    if (!draft.consent) {
      toast({
        title: "Consenso richiesto",
        description: "Devi accettare la data policy per generare il piano.",
        variant: "error",
      });
      return;
    }
    if (remainingPercent > 0) {
      toast({
        title: "Completa le allocazioni",
        description: "Distribuisci tutto il budget o riduci le categorie esistenti.",
        variant: "error",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const planId = await persistPlan(TOTAL_STEPS);
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, locale: draft.locale ?? "it" }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error ?? "Impossibile generare il piano");
      }

      toast({
        title: "Piano generato",
        description: "Puoi consultare i match nella sezione I miei piani.",
        variant: "success",
      });
      trackEvent({ name: "plan_generated", payload: { planId } });
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Riprova più tardi.",
        variant: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Stepper currentStep={currentStep} onStepSelect={handleStepSelect} />
        <StepHeader
          step={currentStep}
          onBack={handleBack}
          onContinue={currentStep === TOTAL_STEPS ? undefined : handleContinue}
          isContinueDisabled={!canContinue || isSaving}
        />
        {renderStep({
              currentStep,
              draft,
              setEventType,
              setGuestTier,
              setBudget,
              setAllocation,
              toggleAutoRebalance,
              updateChoices,
              updateBrief,
              setConsent,
              remainingPercent,
              onGenerate: handleGenerate,
              onSaveDraft: () => persistPlan(currentStep),
              isGenerating,
        })}
      </div>
      <div className="hidden lg:block">
        <StickyRecap />
      </div>
      <div className="lg:hidden">
        <StickyRecap />
      </div>
    </div>
  );
}

type RenderStepParams = {
  currentStep: number;
  draft: ReturnType<typeof usePlanWizard>["draft"];
  setEventType: (id: string) => void;
  setGuestTier: (id: string) => void;
  setBudget: (value: number) => void;
  setAllocation: (category: AllocationCategory, percent: number) => void;
  toggleAutoRebalance: (value: boolean) => void;
  updateChoices: (changes: Partial<ReturnType<typeof usePlanWizard>["draft"]["choices"]>) => void;
  updateBrief: (changes: Partial<ReturnType<typeof usePlanWizard>["draft"]["brief"]>) => void;
  setConsent: (value: boolean) => void;
  remainingPercent: number;
  onGenerate: () => Promise<void>;
  onSaveDraft?: () => Promise<string | void>;
  isGenerating: boolean;
};

function renderStep(params: RenderStepParams) {
  const { currentStep } = params;
  switch (currentStep) {
    case 1:
      return <EventTypeStep {...params} />;
    case 2:
      return <GuestTierStep {...params} />;
    case 3:
      return <BudgetStep {...params} />;
    case 4:
      return <VenueStep {...params} />;
    case 5:
      return <CateringStep {...params} />;
    case 6:
      return <DecorStep {...params} />;
    case 7:
      return <ExtrasStep {...params} />;
    case 8:
      return <AllocationStep {...params} />;
    case 9:
      return <BriefStep {...params} />;
    case 10:
      return <ConsentStep {...params} />;
    default:
      return null;
  }
}

function EventTypeStep({ draft, setEventType }: RenderStepParams) {
  const events = getEventTypes();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {events.map((event) => {
        const isActive = draft.eventTypeId === event.id;
        return (
          <Card
            key={event.id}
            onClick={() => setEventType(event.id)}
            className={cnSelectable(isActive)}
          >
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-slate-900">{event.name}</h3>
                {isActive && <Badge variant="accent">Selezionato</Badge>}
              </div>
              <p className="text-sm text-slate-500">Budget minimo € {event.minBudget.toLocaleString("it-IT")}</p>
              <div className="flex flex-wrap gap-2">
                {event.budgetPresets.map((preset) => (
                  <Badge key={preset.label} variant="outline">
                    {preset.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GuestTierStep({ draft, setGuestTier }: RenderStepParams) {
  const tiers = getAvailableGuestTiers(draft.eventTypeId);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tiers.map((tier) => (
        <Button
          key={tier.id}
          variant={draft.guestTierId === tier.id ? "default" : "outline"}
          className="h-auto w-full flex-col gap-1 rounded-2xl px-6 py-4 text-left"
          onClick={() => setGuestTier(tier.id)}
        >
          <span className="text-base font-semibold text-slate-900">{tier.label}</span>
          <span className="text-xs text-slate-500">Capienza stimata</span>
        </Button>
      ))}
    </div>
  );
}

function BudgetStep({ draft, setBudget }: RenderStepParams) {
  const presets = getBudgetPresets(draft.eventTypeId);
  const event = draft.eventTypeId ? getEventTypeById(draft.eventTypeId) : undefined;
  const [inputValue, setInputValue] = useState(() => draft.totalBudget?.toString() ?? "");
  const recommendedBudget = event?.budgetPresets?.[0]?.value ?? MIN_BUDGET;

  const handleBudgetChange = (value: number) => {
    const normalized = Math.max(MIN_BUDGET, Math.round(value / 100) * 100);
    setInputValue(normalized.toString());
    setBudget(normalized);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={draft.totalBudget === preset.value ? "default" : "outline"}
            className="rounded-2xl px-4"
            onClick={() => handleBudgetChange(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        <Label>Budget totale</Label>
        <Input
          type="number"
          min={MIN_BUDGET}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            const parsed = parseInt(e.target.value, 10);
            if (!Number.isNaN(parsed)) {
              setBudget(parsed);
            }
          }}
        />
        <Slider
          value={[clamp(draft.totalBudget ?? MIN_BUDGET, MIN_BUDGET, 100000)]}
          min={MIN_BUDGET}
          max={100000}
          step={100}
          onValueChange={([value]) => handleBudgetChange(value)}
        />
        <p className="text-xs text-slate-500">Il budget minimo è € 300. Puoi modificarlo in qualsiasi momento.</p>
        {draft.totalBudget && draft.totalBudget < recommendedBudget && (
          <p className="text-xs text-amber-600">Il budget inserito è inferiore alla soglia consigliata per questo evento.</p>
        )}
      </div>
    </div>
  );
}

function VenueStep({ draft, updateChoices }: RenderStepParams) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {venueStyles.map((venue) => {
        const active = draft.choices.venueStyle === venue.id;
        return (
          <Card
            key={venue.id}
            onClick={() => updateChoices({ venueStyle: venue.id })}
            className={cnSelectable(active)}
          >
            <CardContent className="space-y-2 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-slate-900">{venue.label}</h3>
                <Badge variant="outline">{venue.priceBand}</Badge>
              </div>
              <p className="text-xs text-slate-500">Matching basato su capienza, location e budget.</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CateringStep({ draft, updateChoices }: RenderStepParams) {
  const selected = draft.choices.cateringStyles ?? [];
  const toggle = (id: string) => {
    const exists = selected.includes(id);
    const next = exists ? selected.filter((item) => item !== id) : [...selected, id];
    updateChoices({ cateringStyles: next });
  };

  return (
    <div className="flex flex-wrap gap-3">
      {cateringStyles.map((style) => {
        const active = selected.includes(style.id);
        return (
          <Button
            key={style.id}
            variant={active ? "default" : "outline"}
            className="rounded-full px-5"
            onClick={() => toggle(style.id)}
          >
            {style.label}
          </Button>
        );
      })}
    </div>
  );
}

function DecorStep({ draft, updateChoices }: RenderStepParams) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {decorMoods.map((mood) => {
        const active = draft.choices.decorMood === mood.id;
        return (
          <Card
            key={mood.id}
            onClick={() => updateChoices({ decorMood: mood.id })}
            className={cnSelectable(active)}
          >
            <CardContent className="space-y-3 p-6">
              <h3 className="font-display text-lg text-slate-900">{mood.label}</h3>
              <div className="h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100" />
              <p className="text-xs text-slate-500">Palette e styling coordinati per il mood scelto.</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ExtrasStep({ draft, updateChoices }: RenderStepParams) {
  const selected = draft.choices.extras ?? [];
  const toggle = (id: string) => {
    const exists = selected.includes(id);
    const next = exists ? selected.filter((item) => item !== id) : [...selected, id];
    updateChoices({ extras: next });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {extrasOptions.map((extra) => {
        const active = selected.includes(extra.id);
        return (
          <Button
            key={extra.id}
            variant={active ? "default" : "outline"}
            className="justify-start gap-3 rounded-2xl px-5"
            onClick={() => toggle(extra.id)}
          >
            <span className="text-sm font-medium">{extra.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

function AllocationStep({ draft, setAllocation, toggleAutoRebalance, remainingPercent }: RenderStepParams) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-subtle">
        <div>
          <p className="text-sm font-semibold text-slate-900">Auto-rebalance</p>
          <p className="text-xs text-slate-500">Quando aumenti una categoria, le altre si adattano in automatico.</p>
        </div>
        <Switch
          checked={draft.autoRebalance}
          onCheckedChange={(checked) => toggleAutoRebalance(Boolean(checked))}
        />
      </div>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Budget rimanente: <span className="font-semibold text-slate-900">{remainingPercent}%</span>
        </p>
        <Progress value={100 - remainingPercent} />
      </div>
      <div className="space-y-4">
        {allocationOrder.map((category) => {
          const percent = draft.allocations[category];
          const disableIncrease = !draft.autoRebalance && remainingPercent === 0;
          return (
            <div key={category} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-subtle">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900">{categoryLabels[category]}</span>
                <span className="font-semibold text-slate-900">{percent}%</span>
              </div>
              <Slider
                className="mt-3"
                value={[percent]}
                max={100}
                step={1}
                onValueChange={([value]) => setAllocation(category, value)}
                disabled={disableIncrease && percent === 0}
              />
              {disableIncrease && percent === 0 && (
                <p className="mt-2 text-xs text-slate-400">No budget left — reduce another category.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BriefStep({ draft, updateBrief }: RenderStepParams) {
  const [link, setLink] = useState("");
  const handleAddLink = () => {
    if (!link) return;
    const newAsset: PlanBriefAsset = {
      id: uid(),
      type: "link",
      url: link,
      title: link,
    };
    updateBrief({ assets: [...draft.brief.assets, newAsset] });
    setLink("");
  };

  const onDrop = (files: File[]) => {
    files.slice(0, 3).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : undefined;
        if (!result) return;
        const asset: PlanBriefAsset = {
          id: uid(),
          type: "image",
          url: result,
          title: file.name,
        };
        updateBrief({ assets: [...draft.brief.assets, asset] });
      };
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/*": [] } });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Creative brief</Label>
        <Textarea
          value={draft.brief.description}
          onChange={(e) => updateBrief({ description: e.target.value })}
          rows={8}
          placeholder="Describe your vision, vibe, must-haves..."
        />
        <p className="text-xs text-slate-400">Minimo 20 caratteri per un brief efficace.</p>
      </div>
      <div
        {...getRootProps()}
        className={cnSelectable(false, "border-dashed bg-slate-50 text-center text-sm text-slate-500")}
      >
        <input {...getInputProps()} />
        {isDragActive ? "Rilascia i file qui" : "Trascina immagini ispirazionali o clicca per selezionarle (max 3)."}
      </div>
      <div className="space-y-3">
        <Label>Aggiungi link ispirazionali</Label>
        <div className="flex gap-3">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://pinterest.com/..."
          />
          <Button onClick={handleAddLink} disabled={!link}>
            Aggiungi
          </Button>
        </div>
      </div>
      {draft.brief.assets.length > 0 && (
        <ScrollArea className="h-40 rounded-2xl border border-slate-100">
          <div className="grid gap-3 p-4">
            {draft.brief.assets.map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-slate-100 p-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{asset.title}</p>
                <p className="text-xs text-slate-400">{asset.type}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function ConsentStep({ draft, setConsent, onGenerate, onSaveDraft, isGenerating }: RenderStepParams) {
  return (
    <div className="space-y-6">
      <Card className="border-slate-100">
        <CardContent className="space-y-3 p-6 text-sm text-slate-600">
          <h3 className="font-display text-lg text-slate-900">Recap rapido</h3>
          <p>Event type: {draft.eventTypeId ?? "Non selezionato"}</p>
          <p>Guest tier: {draft.guestTierId ?? "Non selezionato"}</p>
          <p>Budget: € {draft.totalBudget?.toLocaleString("it-IT") ?? "—"}</p>
          <p>Allocazioni complete: {getRemainingBudgetPercent(draft.allocations) === 0 ? "Sì" : "No"}</p>
        </CardContent>
      </Card>
      <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-subtle text-sm text-slate-600">
        <Checkbox
          checked={draft.consent}
          onCheckedChange={(checked) => setConsent(Boolean(checked))}
          className="mt-1"
        />
        <span>
          Accetto la Data Policy e acconsento a essere contattato da partner (venue, planner, fornitori).
        </span>
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          className="text-slate-600"
          onClick={async () => {
            try {
              await (onSaveDraft ? onSaveDraft() : Promise.resolve());
              toast({
                title: "Piano salvato",
                description: "Puoi riprendere quando vuoi dalla dashboard.",
              });
            } catch (error) {
              toast({
                title: "Salvataggio non riuscito",
                description: error instanceof Error ? error.message : "Riprova più tardi.",
                variant: "error",
              });
            }
          }}
        >
          Salva e continua più tardi
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating} className="shadow-soft" size="lg">
          {isGenerating ? "Generazione in corso..." : "Generate Event Plan with Fentsi"}
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Prenotando tramite Fentsi hai assistenza, garanzie e condizioni dedicate.
      </p>
    </div>
  );
}

function cnSelectable(isActive: boolean, extra?: string) {
  return [
    "cursor-pointer rounded-3xl border border-slate-100 bg-white shadow-subtle transition",
    isActive ? "ring-2 ring-slate-900" : "hover:border-slate-200",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

const categoryLabels: Record<AllocationCategory, string> = {
  venue: "Venue",
  catering: "Catering",
  decor: "Decor",
  entertainment: "Entertainment",
  av: "AV",
  photo_video: "Photo / Video",
  misc: "Misc",
};
