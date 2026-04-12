'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import type { OutputLanguage } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';

const LANGUAGE_OPTIONS: {
  value: OutputLanguage;
  label: string;
  flag: string;
  sub: string;
}[] = [
  { value: 'it', label: 'Italiano', flag: '🇮🇹', sub: 'Piano in italiano' },
  { value: 'en', label: 'English', flag: '🇬🇧', sub: 'Plan in English' },
  { value: 'fr', label: 'Français', flag: '🇫🇷', sub: 'Plan en français' },
  { value: 'es', label: 'Español', flag: '🇪🇸', sub: 'Plan en español' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪', sub: 'Plan auf Deutsch' },
];

export function Step09_Language() {
  const {
    outputLanguage,
    setOutputLanguage,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(9)}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Domanda 9 di 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            In che lingua vuoi
            <br />
            il tuo piano?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Il piano AI sarà generato interamente nella lingua scelta.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = outputLanguage === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setOutputLanguage(opt.value)}
                className="flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-150"
                style={{
                  background: isSelected ? '#1a1713' : '#111009',
                  borderColor: isSelected ? '#c9975b' : '#2a2520',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{opt.flag}</span>
                <div className="flex-1">
                  <p
                    className="text-sm font-medium"
                    style={{ color: isSelected ? '#f0ebe3' : '#9a8f86' }}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b6258' }}>
                    {opt.sub}
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
