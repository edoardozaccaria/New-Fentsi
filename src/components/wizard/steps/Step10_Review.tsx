'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useEventWizardStore } from '@/store/useEventWizardStore';
import { WizardShell } from '../WizardShell';
import { supabase } from '@/lib/supabase';
import type { EventWizardState } from '@/store/useEventWizardStore';
import type { VendorSuggestion } from '@/types/plan.types';
import { PaywallModal } from '../PaywallModal';

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

const DURATION_LABELS: Record<string, string> = {
  half_day: 'Mezza giornata',
  full_day: 'Giornata intera',
  weekend: 'Weekend',
};

const LANGUAGE_LABELS: Record<string, string> = {
  it: '🇮🇹 Italiano',
  en: '🇬🇧 English',
  fr: '🇫🇷 Français',
  es: '🇪🇸 Español',
  de: '🇩🇪 Deutsch',
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-start justify-between py-3 border-b"
      style={{ borderColor: '#1e1c1a' }}
    >
      <span
        className="text-xs tracking-widest uppercase shrink-0"
        style={{ color: '#6b6258' }}
      >
        {label}
      </span>
      <span
        className="text-sm text-right max-w-[60%]"
        style={{ color: '#f0ebe3' }}
      >
        {value}
      </span>
    </div>
  );
}

const LOADING_MESSAGES = [
  'Stiamo creando il tuo piano evento…',
  'Analizzando fornitori nella tua area…',
  'Ottimizzando il budget per le tue preferenze…',
  'Preparando i dettagli del tuo evento…',
];

function FullscreenLoader({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
      style={{ background: 'rgba(11,10,9,0.97)' }}
    >
      {/* Spinner */}
      <div
        className="rounded-full border-2 border-t-transparent animate-spin"
        style={{
          width: 48,
          height: 48,
          borderColor: '#2a2520',
          borderTopColor: '#c9975b',
        }}
      />
      <p
        className="text-sm text-center max-w-xs leading-relaxed transition-all duration-500"
        style={{ color: '#9a8f86' }}
      >
        {message}
      </p>
    </div>
  );
}

function SupplierSkeleton() {
  return (
    <div
      className="rounded-xl border px-5 py-4 space-y-2 animate-pulse"
      style={{ background: '#111009', borderColor: '#2a2520' }}
    >
      <div
        className="h-3 rounded"
        style={{ background: '#2a2520', width: '60%' }}
      />
      <div
        className="h-2.5 rounded"
        style={{ background: '#1e1c1a', width: '40%' }}
      />
      <div
        className="h-2.5 rounded"
        style={{ background: '#1e1c1a', width: '80%' }}
      />
    </div>
  );
}

function SupplierCard({ supplier }: { supplier: VendorSuggestion }) {
  return (
    <div
      className="rounded-xl border px-5 py-4 space-y-1"
      style={{ background: '#111009', borderColor: '#2a2520' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium" style={{ color: '#f0ebe3' }}>
          {supplier.name}
        </p>
        <span
          className="shrink-0 text-xs px-2 py-0.5 rounded-full"
          style={{ background: '#1e1c1a', color: '#c9975b' }}
        >
          {formatEur(supplier.estimatedPriceUsd)}
        </span>
      </div>
      <p className="text-xs" style={{ color: '#6b6258' }}>
        {supplier.description}
      </p>
    </div>
  );
}

export function Step10_Review() {
  const store = useEventWizardStore();
  const router = useRouter();

  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [generating, setGenerating] = useState(false);
  const [suppliers, setSuppliers] = useState<VendorSuggestion[]>([]);
  const [streamDone, setStreamDone] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [skeletonCount, setSkeletonCount] = useState(0);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMessageRotation = useCallback(() => {
    setLoadingMessageIdx(0);
    messageTimerRef.current = setInterval(() => {
      setLoadingMessageIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 5000);
  }, []);

  const stopMessageRotation = useCallback(() => {
    if (messageTimerRef.current) {
      clearInterval(messageTimerRef.current);
      messageTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopMessageRotation();
  }, [stopMessageRotation]);

  const handleGenerate = useCallback(async (accessToken?: string) => {
    setGenerating(true);
    setSuppliers([]);
    setStreamDone(false);
    setGenerateError('');
    startMessageRotation();

    const expectedCount = store.requiredServices.length * 3;
    setSkeletonCount(expectedCount);

    abortRef.current = new AbortController();

    try {
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        fetchHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/generate-suppliers', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          eventType: store.eventType,
          eventDate: store.eventDate,
          duration: store.duration,
          guestCount: store.guestCount,
          city: store.city,
          venuePreference: store.venuePreference,
          budgetUsd: store.budgetUsd,
          stylePreferences: store.stylePreferences,
          requiredServices: store.requiredServices,
          specialRequirements: store.specialRequirements,
          specialRequests: store.specialRequests,
          outputLanguage: store.outputLanguage,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        if (res.status === 402) {
          setGenerating(false);
          stopMessageRotation();
          setPaywallOpen(true);
          return;
        }
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setGenerateError(err.error ?? 'Generazione fallita.');
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setGenerateError('Risposta vuota.');
        setGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let eventId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'supplier') {
              setSuppliers((prev) => {
                const next = [...prev, parsed.data as VendorSuggestion];
                setSkeletonCount(Math.max(0, expectedCount - next.length));
                return next;
              });
            } else if (parsed.type === 'done') {
              eventId = parsed.eventId;
            } else if (parsed.type === 'error') {
              setGenerateError(parsed.error ?? 'Errore durante la generazione.');
              setGenerating(false);
              stopMessageRotation();
              return;
            }
          } catch {
            // partial chunk
          }
        }
      }

      setStreamDone(true);

      if (eventId) {
        localStorage.removeItem('fentsi-wizard-resume-generate');
        localStorage.removeItem('fentsi-wizard-draft');
        store.reset();
        router.push(`/event-plan/${eventId}`);
      } else {
        setGenerateError('Piano generato ma ID non ricevuto. Riprova.');
        setGenerating(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setGenerateError('Connessione persa. Riprova.');
      }
    } finally {
      stopMessageRotation();
      setGenerating(false);
    }
  }, [store, router, startMessageRotation, stopMessageRotation]);

  useEffect(() => {
    const resumed = localStorage.getItem('fentsi-wizard-resume-generate');
    if (resumed === '1') {
      localStorage.removeItem('fentsi-wizard-resume-generate');
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleGenerate(session?.access_token ?? undefined);
      });
    }
  }, [handleGenerate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = window.setInterval(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resendCooldown]);

  async function handleGenerateCTA() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setAuthOpen(true);
      return;
    }
    handleGenerate(session.access_token);
  }

  async function handleSendMagicLink() {
    if (!authEmail) {
      setAuthError('Inserisci la tua email.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    const draft: EventWizardState = {
      eventType: store.eventType,
      eventDate: store.eventDate,
      guestCount: store.guestCount,
      city: store.city,
      venuePreference: store.venuePreference,
      budgetUsd: store.budgetUsd,
      stylePreferences: store.stylePreferences,
      requiredServices: store.requiredServices,
      duration: store.duration,
      specialRequirements: store.specialRequirements,
      specialRequests: store.specialRequests,
      outputLanguage: store.outputLanguage,
      currentStep: store.currentStep,
      lastStepCompleted: store.lastStepCompleted,
    };

    localStorage.setItem('fentsi-wizard-resume-generate', '1');
    localStorage.setItem('fentsi-wizard-draft', JSON.stringify(draft));

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/create-event/wizard`,
      },
    });
    setAuthLoading(false);
    setResendCooldown(30);

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('rate limit')) {
        setAuthError(
          'Hai inviato troppi link di accesso. Attendi qualche minuto e riprova.'
        );
      } else {
        setAuthError(error.message);
      }
      localStorage.removeItem('fentsi-wizard-resume-generate');
      localStorage.removeItem('fentsi-wizard-draft');
    } else {
      setAuthSent(true);
    }
  }

  const {
    eventType,
    eventDate,
    duration,
    guestCount,
    city,
    venuePreference,
    budgetUsd,
    stylePreferences,
    requiredServices,
    specialRequirements,
    specialRequests,
    outputLanguage,
    currentStep,
    prevStep,
  } = store;

  const venueLabel: Record<string, string> = {
    indoor: 'Interno',
    outdoor: 'Esterno',
    both: 'Interno + Esterno',
    no_preference: 'Nessuna preferenza',
  };

  const eventTypeLabel: Record<string, string> = {
    wedding: 'Matrimonio',
    birthday: 'Compleanno',
    corporate: 'Corporate',
    social_gathering: 'Festa / Ricevimento',
    conference: 'Conferenza',
    other: 'Altro',
  };

  return (
    <>
      {generating && suppliers.length === 0 && (
        <FullscreenLoader message={LOADING_MESSAGES[loadingMessageIdx]!} />
      )}
      <WizardShell
        currentStep={currentStep}
        onBack={prevStep}
        hideNav={generating}
      >
        <div className="space-y-8">
          <div className="space-y-2">
            <p
              className="text-xs tracking-[0.2em] uppercase"
              style={{ color: '#6b6258' }}
            >
              Domanda 10 di 10
            </p>
            <h1
              className="font-serif leading-tight"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: '#f0ebe3',
              }}
            >
              Riepilogo del
              <br />
              tuo evento
            </h1>
          </div>

          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: '#2a2520' }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ background: '#0f0e0c', borderColor: '#2a2520' }}
            >
              <p
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                Le tue scelte
              </p>
            </div>
            <div
              className="px-4 divide-y"
              style={{ background: '#111009', borderColor: '#1e1c1a' }}
            >
              <SummaryRow
                label="Tipo evento"
                value={eventTypeLabel[eventType ?? ''] ?? eventType ?? '—'}
              />
              <SummaryRow
                label="Data"
                value={
                  eventDate
                    ? new Date(eventDate + 'T00:00:00').toLocaleDateString(
                        'it-IT',
                        {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )
                    : '—'
                }
              />
              <SummaryRow
                label="Durata"
                value={DURATION_LABELS[duration] ?? duration}
              />
              <SummaryRow label="Ospiti" value={`${guestCount} ospiti`} />
              <SummaryRow label="Città" value={city || '—'} />
              <SummaryRow
                label="Venue"
                value={
                  venueLabel[venuePreference ?? ''] ?? venuePreference ?? '—'
                }
              />
              <SummaryRow label="Budget" value={formatEur(budgetUsd)} />
              <SummaryRow
                label="Stile"
                value={stylePreferences.join(', ') || '—'}
              />
              <SummaryRow
                label="Servizi"
                value={
                  requiredServices.map((s) => s.replaceAll('_', ' ')).join(', ') ||
                  '—'
                }
              />
              {specialRequirements.length > 0 && (
                <SummaryRow
                  label="Esigenze"
                  value={specialRequirements
                    .map((r) => r.replaceAll('_', ' '))
                    .join(', ')}
                />
              )}
              {specialRequests && (
                <SummaryRow label="Note" value={specialRequests} />
              )}
              <SummaryRow
                label="Lingua piano"
                value={LANGUAGE_LABELS[outputLanguage] ?? outputLanguage}
              />
            </div>
          </div>

          {generateError && (
            <div className="space-y-3">
              <div
                className="rounded-xl border px-5 py-4 text-sm"
                style={{
                  background: '#1a0f10',
                  borderColor: '#b5505a',
                  color: '#e07070',
                }}
              >
                {generateError}
              </div>
              <button
                onClick={handleGenerateCTA}
                className="w-full py-3 rounded-xl font-medium text-sm tracking-wide border transition-colors"
                style={{
                  background: 'transparent',
                  borderColor: '#b5505a',
                  color: '#e07070',
                }}
              >
                Riprova
              </button>
            </div>
          )}

          {(generating || streamDone) && (
            <div className="space-y-4">
              <p
                className="text-xs tracking-widest uppercase"
                style={{ color: '#6b6258' }}
              >
                {streamDone ? 'Fornitori trovati' : 'Ricerca fornitori…'}
              </p>
              <div className="space-y-3">
                {suppliers.map((s) => (
                  <SupplierCard key={`${s.category}-${s.name}`} supplier={s} />
                ))}
                {Array.from({ length: skeletonCount }).map((_, i) => (
                  <SupplierSkeleton key={`sk-${i}`} />
                ))}
              </div>
            </div>
          )}

          {!generating && !streamDone && (
            <button
              onClick={handleGenerateCTA}
              className="w-full py-4 rounded-xl font-medium text-sm tracking-wide transition-opacity"
              style={{ background: '#c9975b', color: '#0b0a09' }}
            >
              Genera il mio piano →
            </button>
          )}
        </div>

        <Dialog.Root open={authOpen} onOpenChange={setAuthOpen}>
          <Dialog.Portal>
            <Dialog.Overlay
              className="fixed inset-0 z-40"
              style={{
                background: 'rgba(11,10,9,0.85)',
                backdropFilter: 'blur(4px)',
              }}
            />
            <Dialog.Content
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border p-8 space-y-6 outline-none"
              style={{ background: '#131110', borderColor: '#2a2520' }}
            >
              <Dialog.Title
                className="font-serif text-xl"
                style={{ color: '#f0ebe3' }}
              >
                Accedi per continuare
              </Dialog.Title>
              <Dialog.Description
                className="text-sm"
                style={{ color: '#6b6258' }}
              >
                Ti invieremo un link magico via email. Dopo l'accesso, il piano
                verrà generato automaticamente.
              </Dialog.Description>

              {authSent ? (
                <div
                  className="rounded-xl border px-5 py-4 text-sm"
                  style={{
                    background: '#0f1a0f',
                    borderColor: '#3a7a3a',
                    color: '#7acc7a',
                  }}
                >
                  Controlla la tua casella — link inviato a{' '}
                  <strong>{authEmail}</strong>.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      className="text-xs tracking-widest uppercase"
                      style={{ color: '#6b6258' }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleSendMagicLink()
                      }
                      placeholder="tu@esempio.it"
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                      style={{
                        background: '#0b0a09',
                        borderColor: '#2a2520',
                        color: '#f0ebe3',
                      }}
                      autoFocus
                    />
                  </div>
                  {authError && (
                    <p className="text-xs" style={{ color: '#b5505a' }}>
                      {authError}
                    </p>
                  )}
                  <button
                    onClick={handleSendMagicLink}
                    disabled={authLoading || resendCooldown > 0}
                    className="w-full py-3 rounded-xl font-medium text-sm transition-opacity"
                    style={{
                      background: '#c9975b',
                      color: '#0b0a09',
                      opacity: authLoading || resendCooldown > 0 ? 0.6 : 1,
                    }}
                  >
                    {authLoading
                      ? 'Invio in corso…'
                      : resendCooldown > 0
                      ? `Riprova tra ${resendCooldown}s`
                      : 'Invia link magico'}
                  </button>
                </div>
              )}

              <Dialog.Close
                className="absolute top-5 right-5 text-xs"
                style={{ color: '#4a4540' }}
              >
                ✕
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </WizardShell>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}
