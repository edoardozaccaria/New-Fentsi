'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';
import type { RequiredService } from '@/types/plan.types';

const OPTIONS: { value: RequiredService; label: string; icon: string }[] = [
  { value: 'catering', label: 'Catering', icon: '🍽️' },
  { value: 'photography', label: 'Photography', icon: '📷' },
  { value: 'videography', label: 'Videography', icon: '🎥' },
  { value: 'flowers', label: 'Flowers', icon: '💐' },
  { value: 'music_dj', label: 'Music / DJ', icon: '🎵' },
  { value: 'lighting', label: 'Lighting', icon: '💡' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'planner', label: 'Planner', icon: '📋' },
];

export function Step8Services() {
  const {
    requiredServices,
    toggleService,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(8)}
      nextDisabled={requiredServices.length === 0}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 8 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Must-have services
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Select every service you need. We'll find suppliers for each.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const isSelected = requiredServices.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleService(opt.value)}
                className="flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-150"
                style={{
                  background: isSelected ? '#1a1713' : '#111009',
                  borderColor: isSelected ? '#c9975b' : '#2a2520',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
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

        {requiredServices.length > 0 && (
          <p className="text-xs" style={{ color: '#6b6258' }}>
            {requiredServices.length} service
            {requiredServices.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    </WizardShell>
  );
}
