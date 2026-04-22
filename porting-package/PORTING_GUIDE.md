# Fentsi — Porting Guide (3-Day Work Backport)

This folder contains all the logic built over the last 3 days on the Mac prototype.
The work is ready to be applied to the real Windows project.

Below is a precise description of **what was built**, **which file to copy**, and **what to adapt**.

---

## What Was Built (Summary)

1. **Real Supabase Auth** — sign-in and sign-up wired up, profile created on registration
2. **Wizard event types from the database** — event types are no longer hardcoded; they come from the `event_types` Supabase table
3. **Plan detail with real vendor matches** — the plan page fetches `vendor_matches` from the DB and shows direct partners, aggregators, and other vendors with working checkout and referral links
4. **Vendor-specific Stripe checkout** — checkout is now tied to a specific `vendorId` and writes a `bookings` record
5. **Referral tracking API** — both GET (redirect-based) and POST, auth-protected, ownership-checked
6. **Pro dashboard with live data** — reads from a `projects` table with role-based display
7. **Two new Supabase migrations** — `projects` + `project_activities` tables (professional lead management) and `events` table (wizard-generated events)

---

## File-by-File Instructions

### 🔐 1. Auth — `lib/auth/actions.ts`

**What changed:** `signInWithEmail` and `signUpWithEmail` were previously stubs. They are now fully wired to Supabase Auth. On sign-up, a row is inserted into `profiles` with `name`, `locale: "it"`, and `role: "user"`.

**Depends on:**
- `lib/supabase/server.ts` — must export `createServerSupabase()` (standard Supabase SSR client)
- `lib/supabase/service.ts` — must export `createServiceSupabase()` (uses the service role key to bypass RLS for the profile upsert)

**Action:** Replace or merge `lib/auth/actions.ts` in your Windows project.

---

### 🧙 2. Wizard store — `stores/plan-wizard.ts`

**What changed:**
- Removed dependency on `lib/data/event-types.ts` (hardcoded file)
- Added `eventTypes: EventTypePreset[]` and `setEventTypes()` to the store
- `getEventTypes()` and `getEventTypeById()` now read from the store instead of a static file
- When `setEventTypes` is called, it validates the current draft's `eventTypeId` and `guestTierId` against the new data

**Action:** Replace `stores/plan-wizard.ts`. If your Windows project has a different store shape, focus on adding `eventTypes` state + `setEventTypes` action and updating `getEventTypes` / `getEventTypeById`.

---

### 🗂️ 3. Create page — `app/(app)/create/page.tsx`

**What changed:** This page is now `async`. It fetches `event_types` from Supabase server-side (`id, name, min_budget, presets`) and passes them as a prop to `<CreateWizard>`.

The `presets` column is a JSONB field with this shape:
```json
{
  "guest_tiers": ["intimate", "medium", "large"],
  "budget_presets": [5000, 10000, 20000]
}
```

**Action:** Replace or merge `app/(app)/create/page.tsx`. The `mapEventTypes` and `normalizePresets` helper functions at the bottom of the file handle the DB → store type mapping.

---

### 🧙 4. Wizard component — `components/wizard/create-wizard.tsx`

**What changed:**
- Now accepts `eventTypes: EventTypePreset[]` as a prop
- Calls `setEventTypes(eventTypes)` in a `useEffect` on mount/change
- Imports `getEventTypeById` from the store instead of `lib/data/event-types`

**Action:** Replace or merge. Focus on the prop addition and the `useEffect` that calls `setEventTypes`.

---

### 🗺️ 5. Plan detail page — `app/(app)/plan/[id]/page.tsx`

**What changed:** This is the biggest change. The page is now fully server-rendered and data-driven.

It fetches:
- The `plans` record with nested `event_type`, `plan_allocations`, `plan_choices`, and `plan_brief_assets`
- `vendor_matches` with nested `vendor` data

Vendors are split into three groups:
- `directPartners` — `vendor.direct_partner = true`
- `aggregators` — `vendor.aggregator = true AND direct_partner = false`
- `otherVendors` — everything else

Each vendor card has:
- A **checkout link** → `/checkout?plan={planId}&vendor={vendorId}&amount={depositAmount}`
- A **referral tracking link** → `/api/referral/click?planId=...&vendorId=...&kind=...&redirect=...`

**Required DB tables:** `plans`, `vendor_matches`, `vendors`, `plan_allocations`, `plan_choices`, `plan_brief_assets`, `event_types`

**Action:** Replace `app/(app)/plan/[id]/page.tsx`. Adapt the Supabase query column names to match your schema if they differ.

---

### 💳 6. Checkout component — `components/checkout/checkout-actions.tsx` (NEW FILE)

**What this is:** A new client component that renders a deposit amount input + a "Procedi al pagamento Stripe" button. It calls `/api/checkout/session` with `planId`, `vendorId`, `amount`, and `currency`.

**Action:** Create `components/checkout/checkout-actions.tsx` in your Windows project.

---

### 💳 7. Checkout page — `app/(app)/checkout/page.tsx`

**What changed:** Now reads `plan`, `vendor`, and `amount` from URL search params and renders `<CheckoutActions>`.

**Action:** Replace or merge.

---

### 💸 8. Stripe checkout API — `app/api/checkout/session/route.ts`

**What changed:**
- `vendorId` is now **required** (not optional)
- Validates that the vendor is actually linked to the plan via `vendor_matches`
- After creating the Stripe session, inserts a row into `bookings` with `status: "initiated"`
- Wraps Stripe call in try/catch

**Required DB table:** `bookings` with columns: `plan_id`, `vendor_id`, `amount_eur`, `stripe_session_id`, `status`

**Action:** Replace `app/api/checkout/session/route.ts`.

---

### 🔗 9. Referral click API — `app/api/referral/click/route.ts`

**What changed:**
- Now supports both **GET** (redirect-based, for `<a>` tags) and **POST** (for fetch calls)
- Auth-protected: requires a logged-in user
- Validates plan ownership and that the vendor is linked to the plan
- GET accepts a `redirect` query param and redirects after tracking

**Action:** Replace `app/api/referral/click/route.ts`.

---

### 🔗 10. Referral confirm API — `app/api/referral/confirm/route.ts`

**What changed:**
- Auth-protected
- If no `referralId` is passed, it looks up the most recent unconverted referral for the plan/vendor pair
- Proper upsert logic: updates existing referral if found, creates a new one if not

**Action:** Replace `app/api/referral/confirm/route.ts`.

---

### 📊 11. Pro dashboard — `app/(app)/pro/dashboard/page.tsx`

**What changed:** No longer shows hardcoded mock data. Now fetches from the `projects` table, filtering by `profile_id` (owner) or `assigned_profile_id` (planner/partner). Shows real metrics: active projects, conversion rate, average budget tier.

**Required DB table:** `projects` (see migration 0002 below)

**Action:** Replace `app/(app)/pro/dashboard/page.tsx`. Adapt column names if your schema differs.

---

### 🗄️ 12. Supabase Migrations

Run both of these on your Windows project's Supabase database.

#### `supabase/migrations/0002_event_inquiries.sql`
Creates:
- `projects` table — the main lead/inquiry record for a service provider. Tracks event type, guest count, budget range, status (draft → submitted → in_review → qualified → completed → archived), UTM params, n8n workflow references.
- `project_activities` table — activity log per project.
- RLS policies for 3 roles: `owner` (the user who submitted), `planner` (assigned coordinator), `partner` (assigned service provider, read-only).

#### `supabase/migrations/0003_events.sql`
Creates:
- `events` table — stores the full wizard output: event type, guests, budget, venue style, mood, catering, entertainment choices, creative brief, and budget allocation (JSONB).

**Action:** Run `supabase db push` from your Windows project root, or apply the SQL directly in the Supabase dashboard SQL editor.

---

### 📐 13. Types — `types/supabase.ts`

Updated Supabase-generated types to include the new tables (`projects`, `project_activities`, `events`, `bookings`, `vendor_matches`, `vendors`).

**Action:** If your Windows project has auto-generated Supabase types, regenerate them after running the migrations with:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```
Otherwise, merge the relevant type additions from this file.

---

## Required `lib/supabase/service.ts`

If your Windows project doesn't have this yet, create it:

```typescript
import { createClient } from "@supabase/supabase-js";

export function createServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

This is used in `lib/auth/actions.ts` to bypass RLS when creating the profile on signup.

---

## How to hand this off to Claude Code on Windows

Open your Windows project in Claude Code and say:

> "I have a porting package with files from a parallel prototype. Please integrate the logic from each file into the appropriate place in this project. Start with the Supabase migrations, then auth, then the wizard, then the plan detail page. The PORTING_GUIDE.md explains what each file does."

Then share this `porting-package` folder with Claude Code on Windows.
