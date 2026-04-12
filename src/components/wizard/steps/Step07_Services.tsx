'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';
import type { RequiredService } from '@/types/plan.types';

const OPTIONS: { value: RequiredService; label: string; icon: string }[] = [
  { value: 'catering', label: 'Catering', icon: '🍽️' },
  { value: 'photography', label: 'Fotografia', icon: '📷' },
  { value: 'videography', label: 'Video', icon: '🎥' },
  { value: 'flowers', label: 'Fiori & Decor', icon: '💐' },
  { value: 'music_dj', label: 'Musica / DJ', icon: '🎵' },
  { value: 'lighting', label: 'Illuminazione', icon: '💡' },
  { value: 'transportation', label: 'Trasporti', icon: '🚗' },
  { value: 'planner', label: 'Wedding Planner', icon: '📋' },
];

export function Step07_Services() {
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
      onNext={() => completeStep(7)}
      nextDisabled={requiredServices.length === 0}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Domanda 7 di 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Di quali servizi
            <br />
            hai bisogno?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Seleziona tutti i servizi che vuoi includere nel piano.
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
            {requiredServices.length}{' '}
            {requiredServices.length === 1
              ? 'servizio selezionato'
              : 'servizi selezionati'}
          </p>
        )}
      </div>
    </WizardShell>
  );
}
