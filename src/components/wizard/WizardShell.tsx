'use client';

import React from 'react';

const STEPS = [
  'Tipo evento',
  'Location',
  'Data & Durata',
  'Ospiti',
  'Budget',
  'Stile',
  'Servizi',
  'Esigenze',
  'Lingua',
  'Riepilogo',
];

interface WizardShellProps {
  currentStep: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNav?: boolean;
}

export function WizardShell({
  currentStep,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  hideNav = false,
}: WizardShellProps) {
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0b0a09' }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: '#0b0a09', borderColor: '#2a2520' }}
      >
        <span
          className="text-sm font-semibold tracking-[0.12em] uppercase"
          style={{ color: '#c9975b' }}
        >
          Fentsi
        </span>
        <span className="text-xs tabular-nums" style={{ color: '#6b6258' }}>
          Step {currentStep} of {STEPS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-px w-full" style={{ background: '#2a2520' }}>
        <div
          className="h-px transition-all duration-500"
          style={{ width: `${progress}%`, background: '#c9975b' }}
        />
      </div>

      {/* Step label strip */}
      <div
        className="flex items-center gap-2 overflow-x-auto px-6 py-3 border-b scrollbar-none"
        style={{ borderColor: '#2a2520' }}
      >
        {STEPS.map((label, idx) => {
          const n = idx + 1;
          const isActive = n === currentStep;
          const isDone = n < currentStep;
          return (
            <div key={n} className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  width: 22,
                  height: 22,
                  background: isDone
                    ? '#c9975b'
                    : isActive
                      ? '#2a2520'
                      : 'transparent',
                  border: isActive
                    ? '1px solid #c9975b'
                    : isDone
                      ? 'none'
                      : '1px solid #3a3530',
                  color: isDone ? '#0b0a09' : isActive ? '#c9975b' : '#4a4540',
                }}
              >
                {isDone ? '✓' : n}
              </div>
              <span
                className="text-xs tracking-wide"
                style={{
                  color: isActive ? '#f0ebe3' : isDone ? '#c9975b' : '#4a4540',
                }}
              >
                {label}
              </span>
              {idx < STEPS.length - 1 && (
                <div
                  className="w-4 h-px shrink-0"
                  style={{ background: isDone ? '#c9975b' : '#2a2520' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-12">
        {children}
      </main>

      {/* Nav buttons */}
      {!hideNav && (
        <footer
          className="sticky bottom-0 flex items-center justify-between px-6 py-5 border-t"
          style={{ background: '#0b0a09', borderColor: '#2a2520' }}
        >
          {onBack ? (
            <button
              onClick={onBack}
              className="text-sm px-5 py-2.5 rounded-lg border transition-colors"
              style={{
                borderColor: '#3a3530',
                color: '#6b6258',
                background: 'transparent',
              }}
            >
              Back
            </button>
          ) : (
            <div />
          )}
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className="text-sm px-6 py-2.5 rounded-lg font-medium transition-opacity"
              style={{
                background: nextDisabled ? '#3a3530' : '#c9975b',
                color: nextDisabled ? '#6b6258' : '#0b0a09',
                opacity: nextDisabled ? 0.6 : 1,
                cursor: nextDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {nextLabel}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
