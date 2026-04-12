'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';
import type { VenuePreference } from '@/types/plan.types';

const CITY_SUGGESTIONS = [
  'Roma',
  'Milano',
  'Firenze',
  'Napoli',
  'Venezia',
  'Torino',
  'Bologna',
  'Palermo',
];

const VENUE_OPTIONS: {
  value: VenuePreference;
  label: string;
  description: string;
}[] = [
  {
    value: 'indoor',
    label: 'Interno',
    description: 'Sala banchetti, loft, villa',
  },
  {
    value: 'outdoor',
    label: 'Esterno',
    description: 'Giardino, terrazza, rooftop',
  },
  {
    value: 'both',
    label: 'Entrambi',
    description: 'Mix di spazi interni ed esterni',
  },
  {
    value: 'no_preference',
    label: 'Nessuna preferenza',
    description: 'Aperto a qualsiasi soluzione',
  },
];

export function Step02_Location() {
  const {
    city,
    setCity,
    venuePreference,
    setVenuePreference,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  const canProceed = city.trim().length > 0 && venuePreference !== null;

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={canProceed ? () => completeStep(2) : undefined}
      nextDisabled={!canProceed}
    >
      <div className="space-y-10">
        {/* City */}
        <div className="space-y-6">
          <div className="space-y-2">
            <p
              className="text-xs tracking-[0.2em] uppercase"
              style={{ color: '#6b6258' }}
            >
              Domanda 2 di 10
            </p>
            <h1
              className="font-serif leading-tight"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: '#f0ebe3',
              }}
            >
              Dove si terrà l'evento?
            </h1>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="city"
              className="block text-xs tracking-widest uppercase"
              style={{ color: '#6b6258' }}
            >
              Città
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="es. Firenze"
              className="w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition-colors"
              style={{
                background: '#111009',
                borderColor: '#2a2520',
                color: '#f0ebe3',
              }}
            />
          </div>

          <div className="space-y-2">
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: '#4a4540' }}
            >
              Città popolari
            </p>
            <div className="flex flex-wrap gap-2">
              {CITY_SUGGESTIONS.map((s) => (
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

        {/* Venue preference */}
        <div className="space-y-4">
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            Preferenza venue
          </p>
          <div className="grid grid-cols-1 gap-3">
            {VENUE_OPTIONS.map((opt) => {
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
      </div>
    </WizardShell>
  );
}
