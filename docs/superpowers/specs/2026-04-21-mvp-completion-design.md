# Fentsi MVP Completion — Design Spec

**Date:** 2026-04-21  
**Approach:** Sequential (A) — each phase deployed before the next begins  
**Stack:** Next.js 16, Supabase Auth, Vercel, Stripe, Resend

---

## Context

Core already shipped: 10-step wizard, AI plan generation (Foursquare + Tavily + Claude), plan display page, gamification engine, Supabase schema with RLS, 121 passing tests.

Missing for production: authentication, user dashboard, payments, email, PDF export, error monitoring.

---

## Phase 1 — Authentication (Supabase Auth + Google + Apple)

**Goal:** Every user has a Supabase identity. Routes are protected. RLS policies work.

**Architecture:**
- Supabase Auth handles OAuth for Google and Apple
- Next.js middleware (`src/middleware.ts`) intercepts unauthenticated requests and redirects to `/login`
- Supabase SSR client (`@supabase/ssr`) manages cookies server-side
- Protected routes: `/create-event`, `/event-plan/[id]`, `/dashboard`
- Public routes: `/`, `/login`, `/signup`

**Components to create:**
- `src/app/(auth)/login/page.tsx` — Google + Apple OAuth buttons, no email/password
- `src/app/(auth)/callback/route.ts` — Supabase OAuth callback handler
- `src/middleware.ts` — session check, redirect logic
- `src/lib/supabase/server.ts` — SSR Supabase client (cookies)
- `src/lib/supabase/client.ts` — browser Supabase client

**Supabase config required:**
- Enable Google provider (Client ID + Secret from Google Cloud Console)
- Enable Apple provider (Service ID + Key from Apple Developer)
- Set Site URL and redirect URLs in Supabase dashboard

**RLS update:** Add `auth.uid() = user_id` policies on `events`, `inquiries` tables.

**Design tokens:** Login page uses warm dark editorial palette. Two large OAuth buttons (Google white, Apple black), DM Serif Display heading, no decorative clutter.

---

## Phase 2 — User Dashboard

**Goal:** Authenticated users see their plans, FP balance, and badges.

**Architecture:**
- `/dashboard` — server component, fetches plans for `auth.uid()` via Supabase
- Plan cards: event type, date created, budget, status (free/pro)
- Sidebar: FP balance, badge count, account tier indicator
- New plan CTA routes to `/create-event`

**Components to create:**
- `src/app/dashboard/page.tsx` — server component
- `src/components/dashboard/PlanCard.tsx`
- `src/components/dashboard/UserSidebar.tsx`
- `src/components/dashboard/BadgeGrid.tsx`

**Data:** Query `events` table filtered by `user_id`. Join gamification data if available.

**Free tier gate:** If user has ≥1 plan and is on free tier, show upgrade CTA on "New Plan" button.

---

## Phase 3 — Stripe Payments

**Goal:** Free tier (1 plan max), Pro tier (unlimited + PDF). Checkout on Vercel, webhooks update Supabase.

**Architecture:**
- Stripe Checkout (hosted, no custom UI needed for MVP)
- `src/app/api/stripe/checkout/route.ts` — creates Checkout Session, passes `user_id` as metadata
- `src/app/api/stripe/webhook/route.ts` — handles `checkout.session.completed`, updates `profiles.tier` in Supabase
- `src/lib/stripe.ts` — Stripe SDK singleton
- `profiles` table in Supabase: `user_id`, `tier` (free|pro), `stripe_customer_id`, `stripe_subscription_id`

**Migration needed:** `004_profiles.sql` — create `profiles` table, trigger to auto-insert on `auth.users` insert.

**Gate logic:** Before saving a new plan in `/api/generate-suppliers`, check `profiles.tier`. If free and plan count ≥ 1, return 403 with upgrade URL.

**Stripe products:**
- Pro Monthly: price configured in Stripe dashboard
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` env vars required

---

## Phase 4 — Email Notifications (Resend)

**Goal:** 3 transactional emails: welcome on signup, plan ready, supplier inquiry confirmation.

**Architecture:**
- Resend SDK (`resend` npm package)
- `src/lib/email.ts` — Resend client singleton + send helpers
- `src/emails/` — React Email templates (3 files)
- Trigger points:
  - Welcome: Supabase Auth webhook on `user.created` → `POST /api/email/welcome`
  - Plan ready: after `/api/generate-suppliers` completes → inline send
  - Inquiry: after inquiry saved → inline send

**Templates (React Email):**
- `WelcomeEmail.tsx` — warm dark design, CTA to create first plan
- `PlanReadyEmail.tsx` — plan summary, link to view
- `InquiryEmail.tsx` — confirmation to user + notification to supplier (if email available)

**Env vars:** `RESEND_API_KEY`, `FROM_EMAIL` (e.g. `noreply@fentsi.io`)

---

## Phase 5 — PDF Export (Pro only)

**Goal:** Pro users can download their event plan as a styled PDF.

**Architecture:**
- `@react-pdf/renderer` — server-side PDF generation, no headless browser needed
- `src/app/api/plan/[id]/pdf/route.ts` — auth check → tier check → generate PDF → stream response
- `src/components/pdf/PlanPDF.tsx` — React PDF document component mirroring plan layout
- Download button on plan page (disabled with upgrade prompt for free users)

**Design:** PDF uses same warm dark editorial visual language adapted for print (light background version).

---

## Phase 6 — Error Monitoring (Sentry)

**Goal:** Errors in production are captured, grouped, and alerted.

**Architecture:**
- `@sentry/nextjs` SDK
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `next.config.ts` wrapped with `withSentryConfig`
- Source maps uploaded on deploy
- Alert rule: notify on new issue or spike

**Env vars:** `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

---

## Deployment Order

1. Phase 1 (Auth) → deploy → verify OAuth flows on Vercel preview URL
2. Phase 2 (Dashboard) → deploy → verify plan list and tier display
3. Phase 3 (Stripe) → deploy → test checkout with Stripe test mode, then flip to live
4. Phase 4 (Email) → deploy → verify Resend delivery in dashboard
5. Phase 5 (PDF) → deploy → verify download for pro user
6. Phase 6 (Sentry) → deploy → trigger a test error, verify capture

---

## Key Constraints

- Apple Sign In requires paid Apple Developer account ($99/year) — confirm before Phase 1
- Stripe webhooks require public HTTPS URL — Vercel deploy needed before webhook testing
- `STRIPE_SECRET_KEY` currently set to `sk_live_*` in all envs including dev — rotate immediately, use `sk_test_*` for dev/staging
- `@supabase/ssr` replaces deprecated `@supabase/auth-helpers-nextjs` — use SSR package

---

## Out of Scope for MVP

- Gamification UI (badges display, leaderboard)
- Social sharing
- Plan editing/versioning
- Multi-language beyond existing framework
- Real-time supplier availability
