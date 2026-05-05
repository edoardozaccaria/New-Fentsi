# Fentsi MVP C — Design Spec

**Date:** 2026-04-25  
**Goal:** Portare New-Fentsi a MVP C funzionante: wizard → piano reale → auth → paywall → Stripe Pro → deploy Vercel

---

## Stato di partenza (New-Fentsi `main`)

| Pezzo | Stato |
|---|---|
| Landing page | ✅ |
| Wizard 10 step | ✅ |
| Generazione piano AI (Foursquare + Tavily + Claude) | ✅ |
| Visualizzazione piano + Deals aggregatori | ✅ |
| Auth (login, Google OAuth, Supabase SSR, proxy) | ✅ |
| Dashboard lista piani utente | ✅ |
| **Stripe paywall + upgrade Pro** | ❌ da implementare |
| **Deploy Vercel** | ❌ da fare |

---

## Architettura

**Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v3, Zustand, Zod, Supabase, Anthropic SDK v0.30, Stripe SDK.

**Struttura route:**
```
src/app/
├── (marketing)/page.tsx       # Landing — pubblica
├── (auth)/login/page.tsx      # Login / OAuth — pubblica
├── (app)/
│   ├── create-event/          # Wizard — 1 piano anonimo free
│   ├── event-plan/[id]/       # Piano — pubblico via link
│   ├── dashboard/             # Lista piani — richiede auth
│   └── checkout/              # Stripe checkout — richiede auth
├── api/
│   ├── generate-suppliers/    # Pipeline AI principale
│   ├── checkout/              # Crea Stripe session
│   └── webhooks/stripe/       # Webhook Stripe → aggiorna Supabase
└── proxy.ts                   # Session refresh + route guard
```

---

## Fase 1 — Verifica locale (prerequisito)

Prima di scrivere codice nuovo, verificare che il flusso esistente funzioni:

1. `npm run dev` in New-Fentsi → app parte senza errori
2. Wizard completo → piano generato con dati reali (non fittizi)
3. Auth login/signup → funziona
4. Dashboard → mostra piani salvati

**Blocchi noti da risolvere se presenti:**
- Chiavi env mancanti o sbagliate (confrontare `.env.development` con `.env.example`)
- Errori TypeScript al build
- Migrazioni Supabase non applicate

---

## Fase 2 — Stripe

### 2.1 Schema DB

Aggiungere a `profiles` (o creare se non esiste):
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plans_generated_free integer DEFAULT 0;
```

### 2.2 Paywall logic

- Dopo la generazione del primo piano: controllare `plans_generated_free` per utenti anonimi (via localStorage) o autenticati (via DB)
- Se `plans_generated_free >= 1` e utente non è Pro → mostrare `<PaywallModal>` prima della generazione
- Il piano anonimo conta: dopo il primo piano anonimo, richiedere login + upgrade

### 2.3 API `/api/checkout`

- Input: `{ priceId: STRIPE_PRO_PRICE_ID }`
- Crea/recupera Stripe customer per l'utente
- Crea `stripe.checkout.sessions.create()` con `mode: 'subscription'`
- Redirect a Stripe Checkout → `success_url: /dashboard?upgraded=true`

### 2.4 Webhook `/api/webhooks/stripe`

Gestire eventi:
- `checkout.session.completed` → aggiorna `subscription_status = 'pro'` in `profiles`
- `customer.subscription.deleted` → aggiorna `subscription_status = 'free'`

### 2.5 Componenti UI

- `<PaywallModal>` — modale che appare al secondo piano, spiega Pro, bottone "Upgrade €19/mese"
- `<ProBadge>` — indicatore utente Pro in navbar/dashboard
- Dashboard: bottone "Nuovo piano" gated per utenti free dopo piano #1

---

## Fase 3 — Test end-to-end

Flusso completo da testare:
1. Utente anonimo → wizard → piano generato ✓
2. Secondo wizard → PaywallModal appare ✓
3. Click "Upgrade" → Stripe Checkout ✓
4. Pagamento test (card Stripe `4242 4242 4242 4242`) → redirect dashboard ✓
5. Webhook ricevuto → `subscription_status = 'pro'` in Supabase ✓
6. Utente Pro → wizard → piano generato senza paywall ✓

---

## Fase 4 — Deploy Vercel

1. Push `main` su GitHub (New-Fentsi)
2. Import progetto su Vercel → collegare repo
3. Configurare Environment Variables su Vercel (tutte le vars da `.env.development`)
4. Configurare Stripe webhook endpoint: `https://fentsi.com/api/webhooks/stripe`
5. Collegare dominio su Vercel dashboard
6. Smoke test su URL di produzione

---

## Criteri di "Done" MVP C

Un utente reale può:
1. Aprire fentsi.com e capire il prodotto in <10 secondi ✓
2. Completare il wizard e ricevere un piano in <60 secondi ✓
3. Registrarsi per salvare il piano ✓
4. Essere fermato da paywall al secondo piano ✓
5. Pagare Pro con carta e generare piani illimitati ✓
6. Condividere il link del piano ✓

---

## Decisioni chiave

- **Codebase:** New-Fentsi (non old Fentsi) — ha auth, dashboard, deals aggregatori già funzionanti
- **Stripe mode:** `subscription` (non `payment` one-shot) — coerente con il piano freemium della wiki
- **Piano anonimo:** 1 gratuito senza account, poi richiede login + (eventualmente) upgrade
- **Vercel:** Piano Pro necessario (timeout 60s per Claude) — `$20/mese`
