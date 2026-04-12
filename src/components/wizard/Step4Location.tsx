'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';

const SUGGESTIONS = [
  'Nashville, TN',
  'Austin, TX',
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Miami, FL',
  'Denver, CO',
  'Seattle, WA',
];

export function Step4Location() {
  const { city, setCity, currentStep, prevStep, completeStep } =
    useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={city.trim() ? () => completeStep(4) : undefined}
      nextDisabled={!city.trim()}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 4 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Where will it take place?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Enter a US city — suppliers will be tailored to your location.
          </p>
        </div>

        <div className="space-y-3">
          <label
            htmlFor="city"
            className="block text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            City
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Nashville, TN"
            className="w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition-colors placeholder-opacity-40"
            style={{
              background: '#111009',
              borderColor: '#2a2520',
              color: '#f0ebe3',
            }}
          />
        </div>

        {/* City suggestions */}
        <div className="space-y-2">
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: '#4a4540' }}
          >
            Popular cities
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setCity(s)}
                className="px-3.5 py-1.5 rounded-full text-xs border transition-colors"
                style={{
                  background: city === s ? '#c9975b' : 'transparent',
                  borderColor: city === s ? '#c9975b' : '#3a3530',
                  color: city === s ? '#0b0a09' : '#6b6258',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
