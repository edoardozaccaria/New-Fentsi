"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { wizardSteps } from "@/lib/wizard/steps";

interface StepHeaderProps {
  step: number;
  onBack: () => void;
  onContinue?: () => void;
  isContinueDisabled?: boolean;
}

export function StepHeader({ step, onBack, onContinue, isContinueDisabled }: StepHeaderProps) {
  const stepData = wizardSteps.find((s) => s.id === step);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {onContinue && (
          <Button onClick={onContinue} disabled={isContinueDisabled} size="sm">
            Continua
          </Button>
        )}
      </div>

      {stepData && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Step {step} di {wizardSteps.length}
          </p>
          <h2 className="font-display text-h3 text-slate-900">{stepData.description}</h2>
        </div>
      )}
    </div>
  );
}
