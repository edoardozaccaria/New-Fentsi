'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';
import type { EventStyle } from '@/types/plan.types';

const OPTIONS: { value: EventStyle; label: string; icon: string }[] = [
  { value: 'rustic', label: 'Rustic', icon: '🌾' },
  { value: 'modern', label: 'Modern', icon: '⬛' },
  { value: 'luxury', label: 'Luxury', icon: '💎' },
  { value: 'bohemian', label: 'Bohemian', icon: '🌸' },
  { value: 'classic', label: 'Classic', icon: '🏛️' },
  { value: 'minimalist', label: 'Minimalist', icon: '○' },
  { value: 'garden', label: 'Garden', icon: '🌿' },
];

export function Step7Style() {
  const { stylePreferences, toggleStyle, currentStep, prevStep, completeStep } =
    useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(7)}
      nextDisabled={stylePreferences.length === 0}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 7 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            What's the aesthetic?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Pick one or more styles that inspire your event.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const isSelected = stylePreferences.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleStyle(opt.value)}
                className="flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-150"
                style={{
                  background: isSelected ? '#1a1713' : '#111009',
                  borderColor: isSelected ? '#c9975b' : '#2a2520',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{opt.icon}</span>
                <span
                  className="text-sm font-medium"
                  style={{ color: isSelected ? '#f0ebe3' : '#9a8f86' }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {stylePreferences.length > 0 && (
          <p className="text-xs" style={{ color: '#6b6258' }}>
            {stylePreferences.length} selected
          </p>
        )}
      </div>
    </WizardShell>
  );
}
