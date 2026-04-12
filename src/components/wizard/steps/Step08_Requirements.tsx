'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';

const MAX_CHARS = 500;

const REQUIREMENT_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'vegetarian', label: 'Menù vegetariano', icon: '🥗' },
  { value: 'vegan', label: 'Menù vegano', icon: '🌱' },
  { value: 'gluten_free', label: 'Senza glutine', icon: '🌾' },
  { value: 'halal', label: 'Halal', icon: '☪️' },
  { value: 'kosher', label: 'Kosher', icon: '✡️' },
  { value: 'wheelchair_access', label: 'Accessibilità disabili', icon: '♿' },
  { value: 'outdoor_permit', label: 'Permessi per eventi outdoor', icon: '📋' },
  { value: 'international_guests', label: 'Ospiti internazionali', icon: '✈️' },
];

export function Step08_Requirements() {
  const {
    specialRequirements,
    toggleSpecialRequirement,
    specialRequests,
    setSpecialRequests,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  const remaining = MAX_CHARS - specialRequests.length;

  function handleTextChange(v: string) {
    if (v.length <= MAX_CHARS) setSpecialRequests(v);
  }

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(8)}
      nextLabel="Continua"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Domanda 8 di 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Esigenze speciali?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Facoltativo — spunta tutto ciò che si applica.
          </p>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 gap-2">
          {REQUIREMENT_OPTIONS.map((opt) => {
            const isChecked = specialRequirements.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleSpecialRequirement(opt.value)}
                className="flex items-center gap-4 rounded-xl border px-5 py-3.5 text-left transition-all duration-150"
                style={{
                  background: isChecked ? '#1a1713' : '#111009',
                  borderColor: isChecked ? '#c9975b' : '#2a2520',
                }}
              >
                <div
                  className="shrink-0 flex items-center justify-center rounded"
                  style={{
                    width: 20,
                    height: 20,
                    background: isChecked ? '#c9975b' : 'transparent',
                    border: isChecked ? 'none' : '1px solid #3a3530',
                  }}
                >
                  {isChecked && (
                    <span
                      style={{
                        color: '#0b0a09',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
                <span
                  className="text-sm"
                  style={{ color: isChecked ? '#f0ebe3' : '#9a8f86' }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Free text */}
        <div className="space-y-2">
          <label
            className="block text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            Note aggiuntive (facoltativo)
          </label>
          <textarea
            value={specialRequests}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="es. Cerimonia alle 16:00, tema Great Gatsby, fiori bianchi e dorati…"
            rows={5}
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
            {remaining} caratteri rimanenti
          </p>
        </div>
      </div>
    </WizardShell>
  );
}
