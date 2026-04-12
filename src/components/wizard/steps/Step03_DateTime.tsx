'use client';

import { useState } from 'react';
import { useEventWizardStore } from '@/store/useEventWizardStore';
import type { EventDuration } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';

function getMinDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0] ?? '';
}

const DURATION_OPTIONS: { value: EventDuration; label: string; sub: string }[] =
  [
    { value: 'half_day', label: 'Mezza giornata', sub: '4–6 ore' },
    { value: 'full_day', label: 'Giornata intera', sub: '8–12 ore' },
    { value: 'weekend', label: 'Weekend', sub: 'Venerdì – Domenica' },
  ];

export function Step03_DateTime() {
  const {
    eventDate,
    setEventDate,
    duration,
    setDuration,
    currentStep,
    prevStep,
    completeStep,
  } = useEventWizardStore();
  const [error, setError] = useState('');

  const minDate = getMinDate();

  function handleDateChange(value: string) {
    setError('');
    setEventDate(value);
  }

  function handleNext() {
    if (!eventDate) {
      setError('Seleziona una data.');
      return;
    }
    if (eventDate < minDate) {
      setError("L'evento deve essere almeno 30 giorni da oggi.");
      return;
    }
    completeStep(3);
  }

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={handleNext}
      nextDisabled={!eventDate}
    >
      <div className="space-y-10">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Domanda 3 di 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            Quando è l'evento
            <br />e quanto dura?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            La data deve essere almeno 30 giorni da oggi.
          </p>
        </div>

        {/* Date */}
        <div className="space-y-3">
          <label
            className="block text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            Data evento
          </label>
          <input
            type="date"
            value={eventDate ?? ''}
            min={minDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition-colors"
            style={{
              background: '#111009',
              borderColor: error ? '#b5505a' : '#2a2520',
              color: '#f0ebe3',
              colorScheme: 'dark',
            }}
          />
          {error && (
            <p className="text-xs" style={{ color: '#b5505a' }}>
              {error}
            </p>
          )}
        </div>

        {eventDate && eventDate >= minDate && (
          <div
            className="rounded-xl border px-5 py-4"
            style={{ background: '#111009', borderColor: '#2a2520' }}
          >
            <p
              className="text-xs tracking-widest uppercase mb-1"
              style={{ color: '#6b6258' }}
            >
              Selezionato
            </p>
            <p className="font-serif text-lg" style={{ color: '#c9975b' }}>
              {new Date(eventDate + 'T00:00:00').toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Duration */}
        <div className="space-y-4">
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            Durata
          </p>
          <div className="grid grid-cols-3 gap-3">
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = duration === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className="flex flex-col items-start gap-1 rounded-xl border px-4 py-4 text-left transition-all duration-150"
                  style={{
                    background: isSelected ? '#1a1713' : '#111009',
                    borderColor: isSelected ? '#c9975b' : '#2a2520',
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: isSelected ? '#f0ebe3' : '#9a8f86' }}
                  >
                    {opt.label}
                  </span>
                  <span className="text-xs" style={{ color: '#6b6258' }}>
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
