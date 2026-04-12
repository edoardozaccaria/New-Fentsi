'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';
import type { EventStyle } from '@/types/plan.types';

const OPTIONS: {
  value: EventStyle;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'rustic',
    label: 'Rustico',
    icon: '🌾',
    description: 'Cascine, legno, naturalità',
  },
  {
    value: 'modern',
    label: 'Moderno',
    icon: '⬛',
    description: 'Linee pulite, minimalismo contemporaneo',
  },
  {
    value: 'luxury',
    label: 'Luxury',
    icon: '💎',
    description: 'Opulenza, fiori, dettagli dorati',
  },
  {
    value: 'bohemian',
    label: 'Boho',
    icon: '🌸',
    description: 'Libero, artistico, floreale',
  },
  {
    value: 'classic',
    label: 'Classico',
    icon: '🏛️',
    description: 'Eleganza senza tempo',
  },
  {
    value: 'minimalist',
    label: 'Minimalista',
    icon: '○',
    description: 'Meno è di più',
  },
  {
    value: 'garden',
    label: 'Garden Party',
    icon: '🌿',
    description: 'Verde, aria aperta, relax',
  },
];

export function Step06_Style() {
  const { stylePreferences, toggleStyle, currentStep, prevStep, completeStep } =
    useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(6)}
      nextDisabled={stylePreferences.length === 0}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Domanda 6 di 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Che atmosfera vuoi
            <br />
            creare?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Puoi selezionare più stili.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const isSelected = stylePreferences.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleStyle(opt.value)}
                className="flex flex-col gap-2 rounded-xl border px-4 py-4 text-left transition-all duration-150"
                style={{
                  background: isSelected ? '#1a1713' : '#111009',
                  borderColor: isSelected ? '#c9975b' : '#2a2520',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{opt.icon}</span>
                <div>
                  <span
                    className="text-sm font-medium block"
                    style={{ color: isSelected ? '#f0ebe3' : '#9a8f86' }}
                  >
                    {opt.label}
                  </span>
                  <span className="text-xs" style={{ color: '#6b6258' }}>
                    {opt.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {stylePreferences.length > 0 && (
          <p className="text-xs" style={{ color: '#6b6258' }}>
            {stylePreferences.length}{' '}
            {stylePreferences.length === 1
              ? 'stile selezionato'
              : 'stili selezionati'}
          </p>
        )}
      </div>
    </WizardShell>
  );
}
