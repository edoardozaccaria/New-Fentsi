'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';
import type { EventType } from '@/types/plan.types';

const OPTIONS: { value: EventType; label: string; icon: string }[] = [
  { value: 'wedding', label: 'Matrimonio', icon: '💍' },
  { value: 'birthday', label: 'Compleanno', icon: '🎂' },
  { value: 'corporate', label: 'Corporate', icon: '🏢' },
  { value: 'social_gathering', label: 'Festa / Ricevimento', icon: '🥂' },
  { value: 'conference', label: 'Conferenza', icon: '🎤' },
  { value: 'other', label: 'Altro', icon: '✨' },
];

export function Step01_EventType() {
  const { eventType, setEventType, currentStep, completeStep } =
    useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onNext={eventType ? () => completeStep(1) : undefined}
      nextDisabled={!eventType}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Domanda 1 di 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Che tipo di evento
            <br />
            stai organizzando?
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const isSelected = eventType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setEventType(opt.value)}
                className="flex flex-col items-start gap-3 rounded-xl p-5 text-left border transition-all duration-150"
                style={{
                  background: isSelected ? '#1a1713' : '#111009',
                  borderColor: isSelected ? '#c9975b' : '#2a2520',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                <span
                  className="text-sm font-medium tracking-wide"
                  style={{ color: isSelected ? '#f0ebe3' : '#9a8f86' }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </WizardShell>
  );
}
