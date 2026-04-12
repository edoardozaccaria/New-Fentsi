'use client';

import * as Slider from '@radix-ui/react-slider';
import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';
import { getBudgetPreview, DEFAULT_ALLOCATIONS } from '@/lib/budgetUtils';

function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

const MIN = 5_000;
const MAX = 500_000;

export function Step6Budget() {
  const {
    budgetUsd,
    setBudgetUsd,
    guestCount,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  const preview = getBudgetPreview(budgetUsd, DEFAULT_ALLOCATIONS);
  const perGuest = guestCount > 0 ? budgetUsd / guestCount : 0;

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(6)}
    >
      <div className="space-y-10">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 6 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            What's your budget?
          </h1>
        </div>

        {/* Big number */}
        <div className="space-y-1">
          <div className="flex items-end gap-3">
            <span
              className="font-serif tabular-nums leading-none"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: '#c9975b' }}
            >
              {formatUsd(budgetUsd)}
            </span>
          </div>
          {guestCount > 0 && (
            <p className="text-xs" style={{ color: '#6b6258' }}>
              ≈ {formatUsd(perGuest)} per guest
            </p>
          )}
        </div>

        {/* Slider */}
        <div className="space-y-4">
          <Slider.Root
            min={MIN}
            max={MAX}
            step={1000}
            value={[budgetUsd]}
            onValueChange={(vals) => {
              if (vals[0] !== undefined) setBudgetUsd(vals[0]);
            }}
            className="relative flex items-center select-none touch-none w-full"
            style={{ height: 20 }}
          >
            <Slider.Track
              className="relative rounded-full grow"
              style={{ background: '#2a2520', height: 3 }}
            >
              <Slider.Range
                className="absolute rounded-full"
                style={{ background: '#c9975b', height: '100%' }}
              />
            </Slider.Track>
            <Slider.Thumb
              className="block rounded-full border-2 outline-none transition-transform hover:scale-110"
              style={{
                width: 20,
                height: 20,
                background: '#c9975b',
                borderColor: '#0b0a09',
                boxShadow: '0 0 0 3px rgba(201,151,91,0.25)',
              }}
              aria-label="Budget"
            />
          </Slider.Root>
          <div
            className="flex justify-between text-xs tabular-nums"
            style={{ color: '#4a4540' }}
          >
            <span>$5K</span>
            <span>$500K</span>
          </div>
        </div>

        {/* Budget breakdown preview */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: '#2a2520' }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ background: '#0f0e0c', borderColor: '#2a2520' }}
          >
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: '#6b6258' }}
            >
              Estimated breakdown
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: '#1e1c1a' }}>
            {preview.map((line) => (
              <div
                key={line.category}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ background: '#111009' }}
              >
                <span className="text-xs" style={{ color: '#9a8f86' }}>
                  {line.label}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: '#6b6258' }}
                  >
                    {line.percent}%
                  </span>
                  <span
                    className="text-xs tabular-nums font-medium"
                    style={{ color: '#f0ebe3' }}
                  >
                    {formatUsd(line.amountUsd)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
