"use client";

import { cn } from "@/lib/utils";
import { wizardSteps } from "@/lib/wizard/steps";
import { usePlanWizard } from "@/stores/plan-wizard";

interface StepperProps {
  currentStep: number;
  onStepSelect: (step: number) => void;
}

export function Stepper({ currentStep, onStepSelect }: StepperProps) {
  const { draft } = usePlanWizard();

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {wizardSteps.map((step) => {
        const isCompleted = step.id < currentStep || step.id <= draft.lastStepCompleted;
        const isCurrent = step.id === currentStep;
        const isAccessible = step.id <= draft.lastStepCompleted + 1;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isAccessible && onStepSelect(step.id)}
            disabled={!isAccessible}
            title={step.title}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
              "disabled:cursor-not-allowed",
              isCurrent && "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2",
              isCompleted && !isCurrent && "bg-slate-200 text-slate-700 hover:bg-slate-300",
              !isCurrent && !isCompleted && "bg-slate-100 text-slate-400",
            )}
          >
            {step.id}
          </button>
        );
      })}
    </div>
  );
}
