# Auth & Dashboard — Design Spec

**Date:** 2026-04-13  
**Status:** Approved  
**Scope:** Fase 2.1 — Auth pages, middleware, dashboard

---

## 1. Goals

- Replace the inline auth dialog in Step10_Review with a proper `/login` redirect
- Add a `/login` page supporting magic link + Google OAuth
- Protect all `(app)/*` routes via Next.js middleware
- Add `/dashboard` showing the user's saved plans with delete capability
- After login, redirect the user back to their original destination (wizard or dashboard)

## 2. File Structure

```
src/app/
  (auth)/
    layout.tsx          ← centered layout, no navbar
    login/
      page.tsx          ← magic link + Google OAuth
  (app)/
    layout.tsx          ← existing authenticated layout (add nav link + logout)
    dashboard/
      page.tsx          ← Server Component, lists user plans
  auth/
    callback/
      route.ts          ← exchanges code for session, redirects to ?next=

src/middleware.ts        ← protects (app)/*, redirects with ?next=
```

## 3. Middleware

- Uses `@supabase/ssr` to read the session from cookies
- Protected path pattern: matches `/dashboard`, `/create-event/*`, `/event-plan/*`
- If no session → `redirect('/login?next=<current-path>')`
- Public paths: `/`, `/login`, `/auth/callback`, `/api/*`

## 4. Login Page (`/login`)

### Magic link
- Email input → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '/auth/callback?next=<value>' } })`
- On success: show "Controlla la tua email" confirmation state
- `next` param is read from the URL and forwarded to `emailRedirectTo`

### Google OAuth
- Button → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback?next=<value>' } })`
- Same `next` forwarding logic

### Layout
- Centered card on dark background (warm dark editorial palette)
- Fentsi logo/wordmark at top
- No wizard shell or app navbar

## 5. Auth Callback (`/auth/callback/route.ts`)

- GET handler
- Calls `supabase.auth.exchangeCodeForSession(code)`
- Reads `next` query param; validates it starts with `/` and is not an external URL
- Redirects to `next` (default: `/dashboard`)

## 6. Step10_Review — Auth change

Remove: Radix `Dialog` auth inline flow, `authOpen/authEmail/authSent/authError/authLoading` state, `handleSendMagicLink`, `useEffect` for `fentsi-wizard-resume-generate`.

Replace `handleGenerateCTA`:
```ts
async function handleGenerateCTA() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    router.push('/login?next=/create-event/wizard');
    return;
  }
  handleGenerate(session.access_token);
}
```

The wizard resumes naturally on return because Step10 calls `supabase.auth.getSession()` on mount and the session is now valid.

Remove the `useEffect` that checked `fentsi-wizard-resume-generate` from sessionStorage — no longer needed.

## 7. Dashboard (`/dashboard`)

### Data
- Server Component
- Uses `createServerClient` from `@supabase/ssr` to read session from cookies
- Query: `SELECT id, event_type, event_date, city, budget_usd, created_at FROM events WHERE user_id = ? ORDER BY created_at DESC`

### Plan card
| Field | Source |
|-------|--------|
| Tipo evento | `event_type` (translated label) |
| Città | `city` |
| Data evento | `event_date` (formatted it-IT) |
| Budget | `budget_usd` (formatted as EUR) |
| Link | `href="/event-plan/${id}"` |
| Elimina | Server Action — confirm modal → DELETE |

### Empty state
- Message: "Nessun piano ancora."
- CTA button: "Crea il tuo primo piano →" → `/create-event/wizard`

### Delete flow
- Client component wraps the delete button
- Confirmation: inline "Sei sicuro? Elimina / Annulla" (no modal library needed)
- Server Action: `supabase.from('events').delete().eq('id', id).eq('user_id', userId)`
- On success: `revalidatePath('/dashboard')`

## 8. App Layout — Nav updates

Add to `(app)/layout.tsx`:
- Link "I miei piani" → `/dashboard`
- Logout button → calls `supabase.auth.signOut()` + `router.push('/')`

## 9. Supabase SSR setup

Install `@supabase/ssr` if not already present. Create:
- `src/lib/supabase-server.ts` — `createServerClient` helper for Server Components / Route Handlers
- `src/lib/supabase-middleware.ts` — `createMiddlewareClient` helper for middleware

The existing `src/lib/supabase.ts` (browser client) stays unchanged for client components.

## 10. Error handling

- Callback route: if `exchangeCodeForSession` fails → redirect to `/login?error=auth_failed`
- Login page: displays `error` param if present ("Link non valido o scaduto.")
- Dashboard delete: if server action fails → show inline error message on the card

## 11. Out of scope

- Signup page (magic link doubles as signup)
- Forgot password (magic link covers this)
- Email verification flows beyond magic link
- Subscription/Pro gating (Fase 2.4)
