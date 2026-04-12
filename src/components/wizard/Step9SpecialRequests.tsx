'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';

const MAX_CHARS = 500;

export function Step9SpecialRequests() {
  const {
    specialRequests,
    setSpecialRequests,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  const remaining = MAX_CHARS - specialRequests.length;

  function handleChange(v: string) {
    if (v.length <= MAX_CHARS) setSpecialRequests(v);
  }

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(9)}
      nextLabel="Continue"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 9 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Any special requests?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Optional — dietary restrictions, themes, accessibility needs, etc.
          </p>
        </div>

        <div className="space-y-2">
          <textarea
            value={specialRequests}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g. Vegan catering only, outdoor ceremony with tent backup, wheelchair accessible venue…"
            rows={6}
            className="w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition-colors resize-none"
            style={{
              background: '#111009',
              borderColor: '#2a2520',
              color: '#f0ebe3',
            }}
          />
          <p
            className="text-xs text-right tabular-nums"
            style={{ color: remaining < 50 ? '#c27a3a' : '#4a4540' }}
          >
            {remaining} characters remaining
          </p>
        </div>
      </div>
    </WizardShell>
  );
}
