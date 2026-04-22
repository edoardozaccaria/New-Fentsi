# Phase 1 — Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Supabase Auth with Google OAuth (Apple OAuth scaffolded but feature-flagged), Next.js 16 `proxy.ts` for session refresh and route protection, SSR-aware Supabase clients for server/browser, working login → callback → protected-route flow.

**Architecture:** Browser client handles `signInWithOAuth` → Supabase redirects to provider → provider redirects to `/auth/callback` → server route exchanges code for session → cookies set → user redirected to `/dashboard`. The `src/proxy.ts` runs on every non-static request, refreshes the session, and redirects unauthenticated users away from protected routes. Existing RLS policies already gate DB access via `auth.uid() = user_id`.

**Tech Stack:** Next.js 16.2.3 (note: `middleware.ts` is deprecated → use `proxy.ts`), `@supabase/ssr` (new dep), `@supabase/supabase-js` 2.103, React 19, Vitest + Testing Library, Zod.

**Spec reference:** `docs/superpowers/specs/2026-04-21-mvp-completion-design.md` §Phase 1.

**Prerequisites (user responsibility, must be done before this plan can ship):**
1. In Supabase dashboard → Auth → Providers: enable Google with Client ID + Secret from Google Cloud Console.
2. In Supabase dashboard → Auth → URL Configuration: set Site URL to `http://localhost:3000` for dev, add `http://localhost:3000/auth/callback` as a redirect URL (and production URL when deploying).
3. (Optional, if Apple Developer account available) Enable Apple provider with Service ID + key. Otherwise set `NEXT_PUBLIC_APPLE_AUTH_ENABLED=false`.
4. Rotate `STRIPE_SECRET_KEY` in `.env.development` from `sk_live_*` → `sk_test_*`. Not blocking Phase 1 but flagged in spec.

---

## File Structure

**Create:**
- `src/lib/supabase/server.ts` — SSR server client factory (uses `cookies()` from `next/headers`)
- `src/lib/supabase/client.ts` — browser client factory (`createBrowserClient`)
- `src/lib/auth/session.ts` — `getUser()` DAL helper wrapping `supabase.auth.getUser()` with React `cache`
- `src/proxy.ts` — Next.js 16 proxy: refresh session on every request + redirect unauthenticated users from protected routes
- `src/app/(auth)/layout.tsx` — auth route-group layout (warm dark editorial)
- `src/app/(auth)/login/page.tsx` — Google + Apple OAuth buttons (Apple conditional)
- `src/app/auth/callback/route.ts` — OAuth callback handler: exchanges `code` for session
- `src/app/auth/signout/route.ts` — signout handler (POST: destroys session, redirects)
- `src/test/supabase-mock.ts` — shared Supabase mock helper for tests
- `src/lib/supabase/server.test.ts`
- `src/lib/auth/session.test.ts`
- `src/proxy.test.ts`
- `src/app/auth/callback/route.test.ts`
- `src/app/(auth)/login/page.test.tsx`

**Modify:**
- `src/lib/supabase.ts` — replace with a thin re-export shim that delegates to new files; mark deprecated in comment
- `src/app/api/generate-suppliers/route.ts` — swap `supabase` import to use `createServerClient` (anonymous key still OK for insert-as-user, service role for bypass if needed)
- `src/app/api/gamification/award/route.ts` — swap `supabase` import + use `getUser()` session helper
- `package.json` — add `@supabase/ssr` dep
- `.env.example` — document `NEXT_PUBLIC_APPLE_AUTH_ENABLED` feature flag and Supabase dashboard setup notes

**No migration needed** — existing `001_initial_schema.sql` already has `auth.uid() = user_id` RLS on `events`, `event_suppliers`, `inquiries`.

---

## Task 1: Add `@supabase/ssr` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Verify installation**

```bash
npm ls @supabase/ssr
```
Expected output contains `@supabase/ssr@0.x.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @supabase/ssr dependency for Phase 1 auth"
```

---

## Task 2: Supabase server client (SSR)

**Files:**
- Create: `src/lib/supabase/server.ts`
- Test: `src/lib/supabase/server.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/supabase/server.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('createSupabaseServerClient', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns a client bound to request cookies', async () => {
    const mockStore = {
      getAll: vi.fn(() => [{ name: 'sb-access-token', value: 'tok' }]),
      set: vi.fn(),
    };
    const { cookies } = await import('next/headers');
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockStore);

    const { createSupabaseServerClient } = await import('./server');
    const client = await createSupabaseServerClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(mockStore.getAll).not.toHaveBeenCalled(); // only called on actual auth op
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/supabase/server.test.ts
```
Expected: FAIL — module `./server` not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — setting cookies here is a no-op.
            // The proxy refreshes session cookies before render.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/supabase/server.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/server.ts src/lib/supabase/server.test.ts
git commit -m "feat(auth): add Supabase SSR server client"
```

---

## Task 3: Supabase browser client

**Files:**
- Create: `src/lib/supabase/client.ts`

- [ ] **Step 1: Write the implementation**

No unit test — the file is a thin factory around `createBrowserClient` and is covered by the login page test.

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/client.ts
git commit -m "feat(auth): add Supabase browser client"
```

---

## Task 4: Session DAL helper

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/auth/session.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('getUser', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns the verified user when session is valid', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', email: 'u1@test.com' } },
          error: null,
        }),
      },
    });

    const { getUser } = await import('./session');
    const user = await getUser();

    expect(user).toEqual({ id: 'u1', email: 'u1@test.com' });
  });

  it('returns null when no session', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'No session' },
        }),
      },
    });

    const { getUser } = await import('./session');
    const user = await getUser();

    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/auth/session.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/auth/session.ts
import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthUser = {
  id: string;
  email: string | null;
};

export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/auth/session.test.ts
```
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts
git commit -m "feat(auth): add getUser/requireUser session DAL helpers"
```

---

## Task 5: Proxy for session refresh + route protection

> Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. Do not create a `middleware.ts`.

**Files:**
- Create: `src/proxy.ts`
- Test: `src/proxy.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/proxy.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe('proxy', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('redirects unauthenticated users away from /dashboard to /login', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const { proxy } = await import('./proxy');
    const res = await proxy(makeRequest('/dashboard'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('lets authenticated users through on /dashboard', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null,
        }),
      },
    });

    const { proxy } = await import('./proxy');
    const res = await proxy(makeRequest('/dashboard'));

    expect(res.status).not.toBe(307);
  });

  it('redirects authenticated users away from /login to /dashboard', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null,
        }),
      },
    });

    const { proxy } = await import('./proxy');
    const res = await proxy(makeRequest('/login'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('allows public route / through without auth', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const { proxy } = await import('./proxy');
    const res = await proxy(makeRequest('/'));

    expect(res.status).not.toBe(307);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/proxy.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/create-event', '/event-plan'];
const AUTH_ROUTES = ['/login'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname);
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)'],
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/proxy.test.ts
```
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/proxy.test.ts
git commit -m "feat(auth): add Next.js 16 proxy for session refresh and route guards"
```

---

## Task 6: OAuth callback route handler

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Test: `src/app/auth/callback/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/auth/callback/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('exchanges code for session and redirects to /dashboard', async () => {
    const exchange = vi.fn().mockResolvedValue({ error: null });
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { exchangeCodeForSession: exchange },
    });

    const { GET } = await import('./route');
    const url = new URL('http://localhost:3000/auth/callback?code=abc123');
    const res = await GET(new NextRequest(url));

    expect(exchange).toHaveBeenCalledWith('abc123');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('honors the ?next= parameter when provided', async () => {
    const exchange = vi.fn().mockResolvedValue({ error: null });
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { exchangeCodeForSession: exchange },
    });

    const { GET } = await import('./route');
    const url = new URL(
      'http://localhost:3000/auth/callback?code=abc123&next=%2Fcreate-event',
    );
    const res = await GET(new NextRequest(url));

    expect(res.headers.get('location')).toContain('/create-event');
  });

  it('redirects to /login?error=oauth when exchange fails', async () => {
    const exchange = vi.fn().mockResolvedValue({ error: { message: 'bad code' } });
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { exchangeCodeForSession: exchange },
    });

    const { GET } = await import('./route');
    const url = new URL('http://localhost:3000/auth/callback?code=abc123');
    const res = await GET(new NextRequest(url));

    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('error=oauth');
  });

  it('redirects to /login?error=no_code when code is missing', async () => {
    const { GET } = await import('./route');
    const url = new URL('http://localhost:3000/auth/callback');
    const res = await GET(new NextRequest(url));

    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('error=no_code');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/app/auth/callback/route.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/app/auth/callback/route.test.ts
```
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/callback/route.ts src/app/auth/callback/route.test.ts
git commit -m "feat(auth): add OAuth callback route handler"
```

---

## Task 7: Login page with Google + Apple OAuth buttons

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/LoginButtons.tsx` (client component)
- Test: `src/app/(auth)/login/page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/(auth)/login/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginButtons } from './LoginButtons';

const signInWithOAuth = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithOAuth },
  }),
}));

describe('LoginButtons', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({ error: null });
  });

  it('renders the Google sign-in button', () => {
    render(<LoginButtons appleEnabled={false} />);
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('does not render Apple button when feature flag is off', () => {
    render(<LoginButtons appleEnabled={false} />);
    expect(screen.queryByRole('button', { name: /apple/i })).not.toBeInTheDocument();
  });

  it('renders Apple button when feature flag is on', () => {
    render(<LoginButtons appleEnabled={true} />);
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument();
  });

  it('calls signInWithOAuth with google when Google button is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginButtons appleEnabled={false} />);
    await user.click(screen.getByRole('button', { name: /google/i }));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- 'src/app/(auth)/login/page.test.tsx'
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `LoginButtons.tsx`**

```tsx
// src/app/(auth)/login/LoginButtons.tsx
'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  appleEnabled: boolean;
  next?: string;
};

export function LoginButtons({ appleEnabled, next }: Props) {
  const [pending, setPending] = useState<null | 'google' | 'apple'>(null);
  const supabase = createSupabaseBrowserClient();

  async function signIn(provider: 'google' | 'apple') {
    setPending(provider);
    const redirect = new URL('/auth/callback', window.location.origin);
    if (next) redirect.searchParams.set('next', next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirect.toString() },
    });
    if (error) setPending(null);
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <button
        type="button"
        onClick={() => signIn('google')}
        disabled={pending !== null}
        className="flex items-center justify-center gap-3 h-12 rounded-md bg-white text-[#0b0a09] font-medium hover:bg-white/90 disabled:opacity-60 transition"
      >
        {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {appleEnabled && (
        <button
          type="button"
          onClick={() => signIn('apple')}
          disabled={pending !== null}
          className="flex items-center justify-center gap-3 h-12 rounded-md bg-black text-white font-medium hover:bg-black/90 disabled:opacity-60 transition"
        >
          {pending === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `page.tsx`**

```tsx
// src/app/(auth)/login/page.tsx
import { LoginButtons } from './LoginButtons';

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, error } = await searchParams;
  const appleEnabled = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true';

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#f5ecdc] mb-2">
          Accedi a Fentsi
        </h1>
        <p className="text-[#c9bca6] text-sm mb-8">
          Continua con il tuo account per pianificare il tuo evento.
        </p>
        <LoginButtons appleEnabled={appleEnabled} next={next} />
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#e8816b]">
            {error === 'oauth'
              ? 'Accesso non riuscito. Riprova.'
              : error === 'no_code'
                ? 'Sessione non valida. Riprova.'
                : 'Si è verificato un errore.'}
          </p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Write `layout.tsx`**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0a09] text-[#f5ecdc]">
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- 'src/app/(auth)/login/page.test.tsx'
```
Expected: PASS (all 4 cases).

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(auth)/' 
git commit -m "feat(auth): add login page with Google + Apple OAuth buttons"
```

---

## Task 8: Signout route handler

**Files:**
- Create: `src/app/auth/signout/route.ts`

- [ ] **Step 1: Write the implementation**

No unit test — purely delegates to Supabase signOut + redirect.

```typescript
// src/app/auth/signout/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
```

- [ ] **Step 2: Smoke-check manually**

```bash
npm run dev
```
Open DevTools console → `fetch('/auth/signout', { method: 'POST' })` → verify redirect + cookies cleared.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/signout/route.ts
git commit -m "feat(auth): add POST /auth/signout route handler"
```

---

## Task 9: Migrate existing API routes to SSR client

**Files:**
- Modify: `src/app/api/generate-suppliers/route.ts`
- Modify: `src/app/api/gamification/award/route.ts`

- [ ] **Step 1: Inspect current imports**

```bash
grep -n "from '@/lib/supabase'" src/app/api -r
```
Expected: list of files importing the legacy singleton.

- [ ] **Step 2: In each file, replace the legacy import**

For `src/app/api/generate-suppliers/route.ts`:
- Replace `import { supabase } from '@/lib/supabase';` with `import { createSupabaseServerClient } from '@/lib/supabase/server';`
- Inside the handler, call `const supabase = await createSupabaseServerClient();` before any `supabase.*` call.
- If the handler needs to INSERT with service role (bypassing RLS), add a separate import for a service-role client — see Step 3.

For `src/app/api/gamification/award/route.ts`:
- Replace legacy import as above.
- Replace the Bearer-token check with `const user = await getUser();` from `@/lib/auth/session` → return 401 if null.

- [ ] **Step 3: Add a service-role client factory (used for RLS-bypass inserts)**

Create `src/lib/supabase/service.ts`:

```typescript
// src/lib/supabase/service.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
```

Where the AI-generated supplier rows are inserted (currently done server-side, no user session available on the insert), switch to `createSupabaseServiceClient()`.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```
Expected: all previously-passing tests still pass. Any test that stub-imported the old singleton needs updating to mock the new factory.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ src/lib/supabase/service.ts
git commit -m "refactor(api): migrate API routes to SSR Supabase client"
```

---

## Task 10: Deprecate legacy `src/lib/supabase.ts`

**Files:**
- Modify: `src/lib/supabase.ts`

- [ ] **Step 1: Replace the file with a shim that re-exports and warns on legacy use**

```typescript
// src/lib/supabase.ts
// Deprecated: use src/lib/supabase/client.ts (browser) or src/lib/supabase/server.ts (SSR).
export { createSupabaseBrowserClient } from './supabase/client';
export { createSupabaseServerClient } from './supabase/server';
```

- [ ] **Step 2: Grep for any remaining legacy `supabase` named imports**

```bash
grep -rn "import { supabase }" src/
```
Expected: no matches. If any remain, update them to call the factory.

- [ ] **Step 3: Run full test suite + build**

```bash
npm test && npm run build
```
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "refactor(auth): replace legacy supabase singleton with SSR factories"
```

---

## Task 11: Document env vars and provider setup

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Read current .env.example**

```bash
cat .env.example
```

- [ ] **Step 2: Append/ensure the following entries exist**

Add to `.env.example` (keep placeholder values, do not commit real secrets):

```bash
# --- Auth feature flags ---
# Set to "true" only after enabling the Apple provider in the Supabase dashboard
# and configuring Service ID + key from a paid Apple Developer account.
NEXT_PUBLIC_APPLE_AUTH_ENABLED=false
```

- [ ] **Step 3: Add a `.env.example` comment block documenting Supabase dashboard steps**

Add this comment block at the top of the Supabase section:

```bash
# --- Supabase ---
# Provider setup (done in Supabase dashboard, not env):
#   1. Auth → Providers → Google → paste Client ID + Secret from Google Cloud
#   2. Auth → URL Configuration → Site URL = http://localhost:3000 (dev) / production URL
#   3. Auth → URL Configuration → Redirect URLs → add http://localhost:3000/auth/callback
#   4. (Optional) Auth → Providers → Apple → Service ID + private key (requires Apple Developer account)
```

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs(auth): document Supabase provider setup in .env.example"
```

---

## Task 12: Manual end-to-end verification

- [ ] **Step 1: Verify prerequisites are done**

In the Supabase dashboard confirm:
- Google provider is enabled with Client ID + Secret.
- Site URL is set to `http://localhost:3000`.
- Redirect URL `http://localhost:3000/auth/callback` is listed.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Unauthenticated flow**

In an incognito window visit `http://localhost:3000/dashboard`.
Expected: redirected to `http://localhost:3000/login?next=%2Fdashboard`.

- [ ] **Step 4: Sign-in flow**

Click "Continue with Google" → authorize → land back on `http://localhost:3000/dashboard`.
(The `/dashboard` page will 404 until Phase 2 — that's fine. The 404 appears after auth succeeded, proving the redirect worked.)

- [ ] **Step 5: Already-signed-in flow**

With cookies still set, visit `http://localhost:3000/login`.
Expected: redirected to `/dashboard`.

- [ ] **Step 6: Sign-out flow**

In DevTools console:
```javascript
fetch('/auth/signout', { method: 'POST', redirect: 'manual' }).then(() => location.reload());
```
Expected: cookies cleared, visiting `/dashboard` again redirects to `/login`.

- [ ] **Step 7: Record findings**

Record any issues or edge cases noticed in a session note for the finishing step.

---

## Task 13: Finish the development branch

- [ ] **Step 1: Confirm full test suite + build pass**

```bash
npm test && npm run build
```

- [ ] **Step 2: Invoke the `superpowers:finishing-a-development-branch` skill**

Follow its instructions to decide merge strategy (merge to main vs PR vs keep as branch).

- [ ] **Step 3: Update `My_Wiki/log.md`** with a Phase 1 completion entry per `My_Wiki/schema.md` rules (date, scope, files created/modified, contradictions resolved, key insight).

---

## Self-Review Checklist (executed after writing plan, before handing off)

**Spec coverage:**
- Supabase Auth OAuth (Google + Apple) ✓ Task 7
- Middleware / route protection ✓ Task 5 (proxy, not middleware — Next.js 16 rename noted)
- SSR Supabase clients ✓ Tasks 2, 3
- OAuth callback ✓ Task 6
- `src/middleware.ts` from spec → documented as `src/proxy.ts` in Next.js 16
- RLS policies on events, inquiries ✓ Already in `001_initial_schema.sql`
- Login page design (warm dark editorial) ✓ Task 7
- Apple dev account dependency ✓ Feature-flagged via `NEXT_PUBLIC_APPLE_AUTH_ENABLED`

**Placeholder scan:** none — all code blocks are complete.

**Type consistency:**
- `createSupabaseServerClient` used consistently across server.ts, session.ts, callback route, signout route.
- `createSupabaseBrowserClient` used consistently in client.ts and LoginButtons.tsx.
- `getUser` / `requireUser` signatures match across DAL and consumers.

**Out of scope (deliberately deferred):**
- `profiles` table creation — Phase 3 (Stripe) will own this, including the `auth.users` trigger.
- Dashboard UI — Phase 2.
- Welcome email on signup — Phase 4.
