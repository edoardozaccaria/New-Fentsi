'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';
import type { VenuePreference } from '@/types/plan.types';

const OPTIONS: {
  value: VenuePreference;
  label: string;
  description: string;
}[] = [
  {
    value: 'indoor',
    label: 'Indoor',
    description: 'Ballroom, banquet hall, loft',
  },
  {
    value: 'outdoor',
    label: 'Outdoor',
    description: 'Garden, terrace, rooftop',
  },
  {
    value: 'both',
    label: 'Both',
    description: 'Mix of indoor and outdoor spaces',
  },
  {
    value: 'no_preference',
    label: 'No Preference',
    description: 'Open to anything',
  },
];

export function Step5VenuePreference() {
  const {
    venuePreference,
    setVenuePreference,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={venuePreference ? () => completeStep(5) : undefined}
      nextDisabled={!venuePreference}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 5 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Indoor or outdoor?
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {OPTIONS.map((opt) => {
            const isSelected = venuePreference === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setVenuePreference(opt.value)}
                className="flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all duration-150"
                style={{
                  background: isSelected ? '#1a1713' : '#111009',
                  borderColor: isSelected ? '#c9975b' : '#2a2520',
                }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: isSelected ? '#f0ebe3' : '#9a8f86' }}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b6258' }}>
                    {opt.description}
                  </p>
                </div>
                <div
                  className="shrink-0 rounded-full border flex items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    borderColor: isSelected ? '#c9975b' : '#3a3530',
                    background: isSelected ? '#c9975b' : 'transparent',
                  }}
                >
                  {isSelected && (
                    <div
                      className="rounded-full"
                      style={{ width: 8, height: 8, background: '#0b0a09' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </WizardShell>
  );
}
