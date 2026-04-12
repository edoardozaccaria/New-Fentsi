'use client';

import { useState } from 'react';
import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';

function getMinDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0] ?? '';
}

export function Step2EventDate() {
  const { eventDate, setEventDate, currentStep, prevStep, completeStep } =
    useEventWizardStore();
  const [error, setError] = useState('');

  const minDate = getMinDate();

  function handleChange(value: string) {
    setError('');
    setEventDate(value);
  }

  function handleNext() {
    if (!eventDate) {
      setError('Please select a date.');
      return;
    }
    if (eventDate < minDate) {
      setError('Event must be at least 30 days from today.');
      return;
    }
    completeStep(2);
  }

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={handleNext}
      nextDisabled={!eventDate}
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 2 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            When is your event?
          </h1>
          <p className="text-sm" style={{ color: '#6b6258' }}>
            Must be at least 30 days from today.
          </p>
        </div>

        <div className="space-y-3">
          <label
            className="block text-xs tracking-widest uppercase"
            style={{ color: '#6b6258' }}
          >
            Event date
          </label>
          <input
            type="date"
            value={eventDate ?? ''}
            min={minDate}
            onChange={(e) => handleChange(e.target.value)}
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
              Selected
            </p>
            <p className="font-serif text-lg" style={{ color: '#c9975b' }}>
              {new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>
    </WizardShell>
  );
}
