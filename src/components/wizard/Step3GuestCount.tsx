'use client';

import * as Slider from '@radix-ui/react-slider';
import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from './WizardShell';

export function Step3GuestCount() {
  const { guestCount, setGuestCount, currentStep, prevStep, completeStep } =
    useEventWizardStore();

  return (
    <WizardShell
      currentStep={currentStep}
      onBack={prevStep}
      onNext={() => completeStep(3)}
    >
      <div className="space-y-10">
        <div className="space-y-2">
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Step 3 of 10
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#f0ebe3',
            }}
          >
            How many guests?
          </h1>
        </div>

        <div className="space-y-6">
          {/* Large number display */}
          <div className="flex items-end gap-3">
            <span
              className="font-serif tabular-nums leading-none"
              style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', color: '#c9975b' }}
            >
              {guestCount}
            </span>
            <span className="text-sm mb-2" style={{ color: '#6b6258' }}>
              guests
            </span>
          </div>

          {/* Radix Slider */}
          <Slider.Root
            min={10}
            max={500}
            step={5}
            value={[guestCount]}
            onValueChange={(vals) => {
              if (vals[0] !== undefined) setGuestCount(vals[0]);
            }}
            className="relative flex items-center select-none touch-none w-full"
            style={{ height: 20 }}
          >
            <Slider.Track
              className="relative rounded-full grow"
              style={{ background: '#2a2520', height: 3 }}
            >
              <Slider.Range
                className="absolute rounded-full"
                style={{ background: '#c9975b', height: '100%' }}
              />
            </Slider.Track>
            <Slider.Thumb
              className="block rounded-full border-2 outline-none transition-transform hover:scale-110 focus:scale-110"
              style={{
                width: 20,
                height: 20,
                background: '#c9975b',
                borderColor: '#0b0a09',
                boxShadow: '0 0 0 3px rgba(201,151,91,0.25)',
              }}
              aria-label="Guest count"
            />
          </Slider.Root>

          <div
            className="flex justify-between text-xs tabular-nums"
            style={{ color: '#4a4540' }}
          >
            <span>10</span>
            <span>500</span>
          </div>
        </div>

        {/* Quick select pills */}
        <div className="flex flex-wrap gap-2">
          {[25, 50, 75, 100, 150, 200, 300].map((n) => (
            <button
              key={n}
              onClick={() => setGuestCount(n)}
              className="px-3.5 py-1.5 rounded-full text-xs border transition-colors"
              style={{
                background: guestCount === n ? '#c9975b' : 'transparent',
                borderColor: guestCount === n ? '#c9975b' : '#3a3530',
                color: guestCount === n ? '#0b0a09' : '#6b6258',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </WizardShell>
  );
}
