'use client';

import * as Slider from '@radix-ui/react-slider';
import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';
import { getBudgetPreview, DEFAULT_ALLOCATIONS } from '@/lib/budgetUtils';

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

const MIN = 2_000;
const MAX = 500_000;

const THRESHOLDS = [
  { label: 'Essenziale', max: 10_000, color: '#6b6258' },
  { label: 'Intermedio', max: 50_000, color: '#c9975b' },
  { label: 'Premium', max: 150_000, color: '#c27a3a' },
  { label: 'Luxury', max: Infinity, color: '#f0ebe3' },
];

function getBudgetTier(n: number) {
  return (
    THRESHOLDS.find((t) => n <= t.max) ?? THRESHOLDS[THRESHOLDS.length - 1]!
  );
}

export function Step05_Budget() {
  const {
    budgetUsd: budget,
    setBudgetUsd: setBudget,
    guestCount,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  const preview = getBudgetPreview(budget, DEFAULT_ALLOCATIONS);
  const perGuest = guestCount > 0 ? budget / guestCount : 0;
  const tier = getBudgetTier(budget);

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(5)}
    >
      <div className="space-y-10">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Domanda 5 di 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Qual è il tuo budget?
          </h1>
        </div>

        <div className="space-y-1">
          <div className="flex items-end gap-3">
            <span
              className="font-serif tabular-nums leading-none"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                color: tier.color,
              }}
            >
              {formatEur(budget)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{ color: tier.color, borderColor: tier.color }}
            >
              {tier.label}
            </span>
            {guestCount > 0 && (
              <p className="text-xs" style={{ color: '#6b6258' }}>
                ≈ {formatEur(perGuest)} per ospite
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Slider.Root
            min={MIN}
            max={MAX}
            step={1000}
            value={[budget]}
            onValueChange={(vals) => {
              if (vals[0] !== undefined) setBudget(vals[0]);
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
            <span>€2K</span>
            <span>€500K</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2">
          {[5_000, 10_000, 20_000, 50_000, 100_000].map((n) => (
            <button
              key={n}
              onClick={() => setBudget(n)}
              className="px-3.5 py-1.5 rounded-full text-xs border transition-colors"
              style={{
                background: budget === n ? '#c9975b' : 'transparent',
                borderColor: budget === n ? '#c9975b' : '#3a3530',
                color: budget === n ? '#0b0a09' : '#6b6258',
              }}
            >
              {formatEur(n)}
            </button>
          ))}
        </div>

        {/* Breakdown */}
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
              Ripartizione stimata
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
                    {formatEur(line.amountUsd)}
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
