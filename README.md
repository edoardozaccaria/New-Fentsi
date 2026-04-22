# Fentsi — AI Event Planner

> Trasforma il caos di Excel e WhatsApp in un piano evento perfetto in 10 minuti.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI GPT-4o-mini
- **Payments**: Stripe (subscriptions)
- **Deploy**: Vercel

---

## Setup locale

### 1. Clona e installa

```bash
git clone https://github.com/TUO_USERNAME/fentsi.git
cd fentsi
npm install
```

### 2. Variabili d'ambiente

```bash
cp .env.example .env.local
```

Compila `.env.local` con:

| Variable | Dove trovarla |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Dashboard → API keys |
| `STRIPE_SECRET_KEY` | Stripe → Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI → `stripe listen` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in dev |

### 3. Setup Supabase

Vai su **Supabase → SQL Editor** ed esegui lo schema in `lib/supabase.ts` (copia i commenti SQL).

### 4. Avvia in dev

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## Deploy su Vercel

1. Pusha il repo su GitHub
2. Vai su [vercel.com/new](https://vercel.com/new) → importa il repo
3. Aggiungi tutte le variabili d'ambiente nel pannello Vercel
4. Deploy! ✨

---

## Struttura del progetto

```
app/
├── page.tsx              → Landing page
├── onboarding/page.tsx   → Flow 10-step
├── dashboard/page.tsx    → Piano evento
└── api/
    ├── generate-plan/    → OpenAI + Supabase
    └── checkout/         → Stripe

components/onboarding/steps/
├── StepEventType.tsx     → Tipo evento
├── StepDate.tsx          → Data
├── StepGuests.tsx        → Ospiti
├── StepBudget.tsx        → Budget
├── StepLocation.tsx      → Location
├── StepStyle.tsx         → Stile/Mood
├── StepPriorities.tsx    → Priorità
├── StepServices.tsx      → Servizi
├── StepRegion.tsx        → Regione
└── StepContact.tsx       → Contatti + submit

lib/
├── store.ts              → Zustand state
├── openai.ts             → AI plan generation
├── supabase.ts           → Database client + schema
├── stripe.ts             → Payment plans
└── utils.ts              → Helpers

types/event.ts            → TypeScript types
```

---

## Roadmap

- [ ] Auth (Supabase Auth + Google OAuth)
- [ ] Dashboard multi-evento per wedding planner
- [ ] PDF export (react-pdf)
- [ ] Ricerca fornitori reali (Google Places API)
- [ ] White-label per location e agenzie
- [ ] App mobile (React Native / Expo)
- [ ] Integrazione calendario (Google Calendar)
- [ ] Chat con Fentsi (AI assistant in-app)
