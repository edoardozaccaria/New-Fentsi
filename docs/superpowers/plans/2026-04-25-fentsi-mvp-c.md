# Fentsi MVP C — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere il paywall Stripe all'app New-Fentsi già funzionante e fare il deploy su Vercel, completando l'MVP C (wizard → piano → auth → paywall → upgrade Pro).

**Architecture:** La maggior parte dell'infrastruttura Stripe è già presente (`stripe.server.ts`, `stripe.ts`, `/api/checkout`, `/api/stripe/webhook`, `CheckoutPage`, `CheckoutActions`). Mancano: (1) una migrazione DB per aggiungere `'single'` ai valori consentiti di `subscription_tier` (bug attuale: il webhook fallirebbe silenziosamente per utenti 'single'), (2) il check del limite piano in `generate-suppliers`, (3) il `PaywallModal` nel wizard, (4) il gate visivo in dashboard. Il deploy è un task separato.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Zustand, Zod, Supabase (SSR via `@supabase/ssr`), Anthropic SDK, Stripe SDK, Radix UI.

**Working directory:** `C:/Users/edoza/OneDrive/Desktop/New-Fentsi`

---

## Task 0: Verifica dev locale

> Prima di scrivere codice nuovo, confermiamo che l'app parta e il flusso base funzioni.

**Files:**
- Read: `.env.development`
- Run: `npm run dev`

- [ ] **Step 1: Apri un terminale nella cartella New-Fentsi**

```bash
cd "C:/Users/edoza/OneDrive/Desktop/New-Fentsi"
npm install
```

Expected: nessun errore critico. Se ci sono peer dependency warnings, ignorali.

- [ ] **Step 2: Avvia il server**

```bash
npm run dev
```

Expected: `Ready on http://localhost:3000` in ~5 secondi.

Se esce errore tipo `Missing env variable`, apri `.env.development` e controlla che le variabili seguenti abbiano un valore (non vuoto):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

- [ ] **Step 3: Testa il flusso base nel browser**

Apri `http://localhost:3000` e verifica:
1. Landing page si carica ✓
2. Clicca "Crea il tuo piano" → redirect a `/create-event/wizard` → appare Step 1 ✓
3. Apri `http://localhost:3000/login` → pagina login si carica ✓

Se uno di questi passi fallisce, segnala l'errore prima di procedere. Se tutto ok, continua.

- [ ] **Step 4: Commit se ci sono dipendenze aggiornate**

```bash
cd "C:/Users/edoza/OneDrive/Desktop/New-Fentsi"
git add package-lock.json
git commit -m "chore: sync package-lock after npm install" 2>/dev/null || echo "nothing to commit"
```

---

## Task 0.5: Fix migrazione DB — aggiungi 'single' a subscription_tier

> **Bug:** la constraint attuale `CHECK (subscription_tier IN ('free', 'pro', 'planner', 'agency', 'venue'))` non include `'single'`. Il piano Stripe 'single' esiste in `stripe.ts` ma Supabase rifiuterebbe silenziosamente il write del webhook. Va fixato prima di implementare il paywall.

**Files:**
- Create: `supabase/migrations/006_subscription_tier_single.sql`

- [ ] **Step 1: Crea la migrazione**

Crea `supabase/migrations/006_subscription_tier_single.sql`:

```sql
-- Add 'single' to the allowed subscription_tier values.
-- The existing CHECK constraint must be dropped and recreated.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'single', 'pro', 'planner', 'agency', 'venue'));
```

- [ ] **Step 2: Applica la migrazione in Supabase**

Vai su [supabase.com](https://supabase.com) → il tuo progetto → SQL Editor.
Incolla il contenuto del file e clicca **Run**.

Expected: `Success. No rows returned.`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_subscription_tier_single.sql
git commit -m "fix: allow subscription_tier='single' in profiles check constraint"
```

---

## Task 1: Paywall gate in `/api/generate-suppliers`

> Il route handler ora accetta qualsiasi utente autenticato. Aggiungiamo un check: se l'utente è free e ha già 1+ piani, restituiamo 402.

**Files:**
- Modify: `src/app/api/generate-suppliers/route.ts` (aggiungere check dopo auth, prima dello streaming)
- Create: `src/app/api/generate-suppliers/route.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce**

Crea il file `src/app/api/generate-suppliers/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase clients
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: vi.fn(),
}));
vi.mock('@/lib/ai', () => ({
  buildPrompt: vi.fn(() => 'mock-prompt'),
}));
vi.mock('@/services/supplier-discovery', () => ({
  discoverSuppliers: vi.fn(async () => ({})),
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      stream: vi.fn(async function* () {}),
    },
  })),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

function makeRequest(body: object) {
  return new Request('http://localhost/api/generate-suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  eventType: 'wedding',
  eventDate: '2026-10-01',
  duration: 'full_day',
  guestCount: 80,
  city: 'Firenze',
  venuePreference: 'indoor',
  budgetUsd: 15000,
  stylePreferences: ['elegante'],
  requiredServices: ['catering'],
  specialRequirements: [],
  outputLanguage: 'it',
};

describe('POST /api/generate-suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 402 when free user has already generated a plan', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-123' } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({
            data: [{ subscription_tier: 'free' }],
            error: null,
          })),
        })),
      })),
    };

    // Second call: count events returns 1
    let fromCallCount = 0;
    mockSupabase.from = vi.fn(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // profiles query
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { subscription_tier: 'free' },
                error: null,
              })),
            })),
          })),
        };
      }
      // events count query
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({
            count: 1,
            error: null,
          })),
        })),
      };
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>
    );

    const { POST } = await import('./route');
    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('plan_limit_reached');
  });

  it('returns 401 when user is not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
        })),
      },
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>
    );

    const { POST } = await import('./route');
    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Esegui il test per verificare che fallisca**

```bash
cd "C:/Users/edoza/OneDrive/Desktop/New-Fentsi"
npx vitest run src/app/api/generate-suppliers/route.test.ts
```

Expected: FAIL — il test `returns 402` fallisce perché la route non fa ancora il check.

- [ ] **Step 3: Aggiungi il paywall check in `generate-suppliers/route.ts`**

In `src/app/api/generate-suppliers/route.ts`, dopo il blocco auth check (riga ~66-73), aggiungi:

```typescript
  // --- Paywall check: free users limited to 1 plan ---
  const supabaseService = createSupabaseServiceClient();

  const { data: profile } = await supabaseService
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier ?? 'free';

  if (tier === 'free') {
    const { count } = await supabaseService
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) >= 1) {
      return Response.json(
        { error: 'plan_limit_reached' },
        { status: 402 }
      );
    }
  }
```

L'import `createSupabaseServiceClient` è già presente in cima al file.

- [ ] **Step 4: Esegui il test di nuovo**

```bash
npx vitest run src/app/api/generate-suppliers/route.test.ts
```

Expected: entrambi i test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate-suppliers/route.ts src/app/api/generate-suppliers/route.test.ts
git commit -m "feat: paywall gate — 402 for free users with 1+ plans"
```

---

## Task 2: PaywallModal nel wizard (Step10_Review)

> Quando la generazione ritorna 402, mostriamo una modale di upgrade invece del messaggio di errore generico.

**Files:**
- Create: `src/components/wizard/PaywallModal.tsx`
- Modify: `src/components/wizard/steps/Step10_Review.tsx`

- [ ] **Step 1: Crea il componente `PaywallModal`**

Crea `src/components/wizard/PaywallModal.tsx`:

```typescript
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PaywallModal({ open, onClose }: Props) {
  const router = useRouter();

  function goToCheckout() {
    onClose();
    router.push('/checkout');
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
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
          <div className="space-y-2">
            <Dialog.Title
              className="font-serif text-xl"
              style={{ color: '#f0ebe3' }}
            >
              Hai usato il tuo piano gratuito
            </Dialog.Title>
            <Dialog.Description className="text-sm" style={{ color: '#6b6258' }}>
              Il piano gratuito include 1 evento completo. Passa a Pro per
              creare fino a 30 piani al mese con fornitori premium.
            </Dialog.Description>
          </div>

          <ul className="space-y-2 text-sm" style={{ color: '#e8dfcd' }}>
            {[
              'Fino a 30 piani/mese',
              'Fornitori premium filtrati per budget',
              'Richiesta preventivi illimitata',
              'Export PDF del piano',
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span style={{ color: '#e8816b' }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <button
              type="button"
              onClick={goToCheckout}
              className="w-full py-3 rounded-xl font-medium text-sm tracking-wide transition-opacity"
              style={{ background: '#c9975b', color: '#0b0a09' }}
            >
              Upgrade a Pro — €29/mese
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm"
              style={{ color: '#6b6258' }}
            >
              Torna indietro
            </button>
          </div>

          <Dialog.Close
            className="absolute top-5 right-5 text-xs"
            style={{ color: '#4a4540' }}
          >
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Aggiungi stato e logica paywall in `Step10_Review.tsx`**

In `src/components/wizard/steps/Step10_Review.tsx`:

**Aggiungi l'import** in cima (dopo gli import esistenti):
```typescript
import { PaywallModal } from '../PaywallModal';
```

**Aggiungi lo stato** dentro `Step10_Review` (dopo `const [generateError, setGenerateError] = useState('')`):
```typescript
const [paywallOpen, setPaywallOpen] = useState(false);
```

**Modifica il blocco `if (!res.ok)`** nella funzione `handleGenerate` per intercettare il 402:

Trova questo blocco (~riga nel file originale):
```typescript
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setGenerateError(err.error ?? 'Generazione fallita.');
        setGenerating(false);
        return;
      }
```

Sostituiscilo con:
```typescript
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
```

**Aggiungi il componente `<PaywallModal>`** alla fine del return, subito prima del `</WizardShell>` di chiusura:

Trova:
```typescript
        </Dialog.Root>
      </WizardShell>
    </>
  );
}
```

Sostituisci con:
```typescript
        </Dialog.Root>
      </WizardShell>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
cd "C:/Users/edoza/OneDrive/Desktop/New-Fentsi"
npx tsc --noEmit
```

Expected: nessun errore TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/components/wizard/PaywallModal.tsx src/components/wizard/steps/Step10_Review.tsx
git commit -m "feat: PaywallModal — show upgrade prompt on 402 from generate-suppliers"
```

---

## Task 3: Dashboard — stato piano e gate "Nuovo Evento"

> La dashboard mostra sempre la card "Nuovo evento". Aggiungiamo: se l'utente è free e ha già 1+ piani, la card mostra il lock e porta a `/checkout`.

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Create: `src/lib/plans.ts` (helper per contare piani utente)

- [ ] **Step 1: Crea il helper `src/lib/plans.ts`**

```typescript
import 'server-only';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// Max events per billing period by tier. Unknown tiers default to free limits.
const TIER_LIMITS: Record<string, number> = {
  free: 1,
  single: 1,
  pro: 30,
  planner: 30,
  agency: 200,
  venue: 200,
};

export type UserPlanStatus = {
  tier: string;
  eventsCount: number;
  canCreateEvent: boolean;
};

export async function getUserPlanStatus(userId: string): Promise<UserPlanStatus> {
  const db = createSupabaseServiceClient();

  const [profileResult, countResult] = await Promise.all([
    db.from('profiles').select('subscription_tier').eq('id', userId).single(),
    db.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const tier = profileResult.data?.subscription_tier ?? 'free';
  const eventsCount = countResult.count ?? 0;
  const limit = TIER_LIMITS[tier] ?? 1;

  return {
    tier,
    eventsCount,
    canCreateEvent: eventsCount < limit,
  };
}
```

- [ ] **Step 2: Scrivi test per `getUserPlanStatus`**

Crea `src/lib/plans.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: vi.fn(),
}));

import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getUserPlanStatus } from './plans';

function makeDb(tier: string, count: number) {
  let fromCallCount = 0;
  return {
    from: vi.fn((_table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // profiles query
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { subscription_tier: tier },
                error: null,
              })),
            })),
          })),
        };
      }
      // events count query
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ count, error: null })),
        })),
      };
    }),
  };
}

describe('getUserPlanStatus', () => {
  it('free user with 0 events can create', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('free', 0) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'free', eventsCount: 0, canCreateEvent: true });
  });

  it('free user with 1 event cannot create', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('free', 1) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'free', eventsCount: 1, canCreateEvent: false });
  });

  it('pro user with 15 events can create', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('pro', 15) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'pro', eventsCount: 15, canCreateEvent: true });
  });

  it('single user with 1 event cannot create (same limit as free)', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('single', 1) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'single', eventsCount: 1, canCreateEvent: false });
  });
});
```

- [ ] **Step 3: Esegui il test**

```bash
cd "C:/Users/edoza/OneDrive/Desktop/New-Fentsi"
npx vitest run src/lib/plans.test.ts
```

Expected: 3 test PASS.

- [ ] **Step 4: Aggiorna `dashboard/page.tsx` per usare il plan status**

Sostituisci il contenuto di `src/app/(app)/dashboard/page.tsx` con:

```typescript
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserPlanStatus } from '@/lib/plans';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/dashboard');

  const planStatus = await getUserPlanStatus(user.id);

  return (
    <main className="min-h-screen bg-[#0b0a09] text-[#f5ecdc] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl mb-3">
          Ciao
          {user.user_metadata?.full_name
            ? `, ${user.user_metadata.full_name}`
            : ''}{' '}
          👋
        </h1>
        <p className="text-[#c9bca6] mb-10">
          Benvenutə nella tua area Fentsi. Da qui crei, consulti e gestisci i
          tuoi eventi.
        </p>

        {/* Plan status badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#f5ecdc]/10 px-4 py-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: planStatus.tier === 'free' ? '#6b6258' : '#c9975b' }}
          />
          <span className="text-xs text-[#c9bca6]">
            {planStatus.tier === 'free'
              ? `Piano gratuito — ${planStatus.eventsCount}/1 piano usati`
              : `Piano ${planStatus.tier} — ${planStatus.eventsCount} piani creati`}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {planStatus.canCreateEvent ? (
            <Link
              href="/create-event/wizard"
              className="group rounded-2xl border border-[#f5ecdc]/10 bg-[#11100e] p-6 hover:border-[#e8816b]/40 transition"
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">
                Nuovo evento
              </h2>
              <p className="text-sm text-[#c9bca6]">
                Avvia il wizard e ottieni un piano generato su misura.
              </p>
            </Link>
          ) : (
            <Link
              href="/checkout"
              className="group rounded-2xl border border-[#e8816b]/30 bg-[#11100e] p-6 hover:border-[#e8816b]/60 transition"
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1 flex items-center gap-2">
                Nuovo evento
                <span className="text-sm font-normal text-[#e8816b]">🔒 Pro</span>
              </h2>
              <p className="text-sm text-[#c9bca6]">
                Hai usato il tuo piano gratuito. Passa a Pro per continuare.
              </p>
            </Link>
          )}

          <Link
            href="/checkout"
            className="group rounded-2xl border border-[#f5ecdc]/10 bg-[#11100e] p-6 hover:border-[#e8816b]/40 transition"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">
              {planStatus.tier === 'free' ? 'Upgrade a Pro' : 'Gestisci piano'}
            </h2>
            <p className="text-sm text-[#c9bca6]">
              {planStatus.tier === 'free'
                ? 'Sblocca più eventi, fornitori premium e coordinamento.'
                : 'Visualizza e gestisci la tua sottoscrizione.'}
            </p>
          </Link>
        </div>

        <form action="/auth/signout" method="post" className="mt-12">
          <button
            type="submit"
            className="text-sm text-[#c9bca6] hover:text-[#f5ecdc] underline underline-offset-4"
          >
            Esci
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/lib/plans.ts src/lib/plans.test.ts src/app/(app)/dashboard/page.tsx
git commit -m "feat: dashboard plan status + gate Nuovo Evento for free users"
```

---

## Task 4: Test end-to-end locale

> Verifichiamo manualmente il flusso completo prima del deploy.

- [ ] **Step 1: Avvia il server e completa il wizard**

```bash
npm run dev
```

1. Vai su `http://localhost:3000`
2. Clicca "Crea il tuo piano" → completa tutti e 10 i passi del wizard
3. Clicca "Genera il mio piano" → se non loggato, comparirà il modal auth
4. Effettua il login (magic link o Google)
5. Il piano deve generarsi e mostrare i fornitori
6. Sei ora su `/event-plan/[id]` ✓

- [ ] **Step 2: Testa il paywall**

1. Torna su `http://localhost:3000/create-event/wizard`
2. Completa di nuovo il wizard
3. Clicca "Genera il mio piano"
4. **Expected:** appare il `PaywallModal` (non il messaggio di errore generico)
5. Verifica che il bottone "Upgrade a Pro" porti a `/checkout`

- [ ] **Step 3: Testa il checkout Stripe (modalità test)**

1. Vai su `/checkout`
2. Clicca "Abbonati a Pro"
3. Verrai reindirizzato a Stripe Checkout
4. Inserisci la carta di test: `4242 4242 4242 4242`, scadenza `12/34`, CVC `123`
5. Completa il pagamento
6. **Expected:** redirect a `/dashboard?checkout=success`

> **Nota:** Il webhook Stripe in locale richiede `stripe listen` — se non hai Stripe CLI installato, testa solo il redirect. La verifica del webhook avverrà in produzione.

- [ ] **Step 4: Esegui tutti i test**

```bash
npx vitest run
```

Expected: tutti i test passano (136+ test).

---

## Task 5: Deploy su Vercel

> Passiamo da locale a produzione.

**Prerequisiti (da fare UNA VOLTA nella Stripe/Supabase dashboard):**

- [ ] **Step 1: Configura Google OAuth in Supabase**

1. Vai su [supabase.com](https://supabase.com) → il tuo progetto → Authentication → Providers
2. Abilita **Google**
3. Inserisci Client ID e Client Secret (da Google Cloud Console → APIs & Services → Credentials)
4. Aggiungi `http://localhost:3000/auth/callback` come URL di redirect autorizzato

- [ ] **Step 2: Crea l'account Vercel e importa il progetto**

1. Vai su [vercel.com](https://vercel.com) → New Project
2. Seleziona la repo `New-Fentsi` da GitHub
3. Framework preset: **Next.js** (rilevato automaticamente)
4. **NON cliccare Deploy ancora** — prima configura le env vars

- [ ] **Step 3: Configura le Environment Variables su Vercel**

In Vercel → Settings → Environment Variables, aggiungi queste variabili (copia i valori dal tuo `.env.development`):

| Variable | Environment |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | Production, Preview, Development |
| `STRIPE_SECRET_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | Production (verrà aggiornato al passo 6) |
| `STRIPE_PRO_PRICE_ID` | Production, Preview, Development |
| `STRIPE_SINGLE_PRICE_ID` | Production, Preview, Development |
| `STRIPE_AGENCY_PRICE_ID` | Production, Preview, Development |
| `FOURSQUARE_API_KEY` | Production, Preview, Development |
| `TAVILY_API_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | Production: `https://fentsi.com` |
| `NEXT_PUBLIC_APP_ENV` | Production: `production` |
| `AUTH_SECRET` | Production, Preview, Development |
| `RESEND_API_KEY` | Production, Preview, Development |

- [ ] **Step 4: Deploy**

1. In Vercel → clicca **Deploy**
2. Attendi il build (2–3 minuti)
3. Se il build fallisce, leggi i log di errore e segnala

- [ ] **Step 5: Aggiorna Supabase con l'URL di produzione**

1. Supabase → Authentication → URL Configuration
2. **Site URL:** `https://fentsi.com` (o l'URL Vercel assegnato, es. `https://new-fentsi.vercel.app`)
3. **Redirect URLs:** aggiungi `https://fentsi.com/auth/callback`

- [ ] **Step 6: Configura Stripe Webhook per produzione**

1. Vai su [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → Webhooks
2. Clicca **Add endpoint**
3. URL: `https://fentsi.com/api/stripe/webhook`
4. Events: seleziona `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Clicca **Add endpoint**
6. Copia il **Signing secret** (formato `whsec_...`)
7. In Vercel → Settings → Environment Variables → aggiorna `STRIPE_WEBHOOK_SECRET` con questo valore
8. Fai un nuovo deploy (Vercel → Deployments → Redeploy)

- [ ] **Step 7: Collega il dominio (se hai fentsi.com)**

1. Vercel → Settings → Domains → Add Domain
2. Inserisci `fentsi.com`
3. Segui le istruzioni per aggiornare i DNS record nel tuo registrar

- [ ] **Step 8: Smoke test in produzione**

1. Apri `https://fentsi.com` (o URL Vercel)
2. Completa il wizard → piano generato ✓
3. Login con Google ✓
4. PaywallModal al secondo piano ✓
5. Checkout Stripe con carta test → `4242 4242 4242 4242` ✓
6. Controlla Supabase → tabella `profiles` → `subscription_status = 'active'` ✓

---

## Criteri di Done

- [ ] `npm run dev` parte senza errori
- [ ] Wizard completo → piano generato con fornitori reali
- [ ] PaywallModal appare al secondo piano
- [ ] Stripe checkout funziona (carta test)
- [ ] Webhook aggiorna `subscription_status` in Supabase
- [ ] Dashboard mostra stato piano (free/pro)
- [ ] Deploy su Vercel funzionante
- [ ] Tutti i test passano (`npx vitest run`)
