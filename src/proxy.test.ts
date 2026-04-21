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
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
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

  it('redirects authenticated users away from /login to post-auth landing', async () => {
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
    const location = res.headers.get('location')!;
    expect(new URL(location).pathname).toBe('/dashboard');
  });

  it('allows public route / through without auth', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const { proxy } = await import('./proxy');
    const res = await proxy(makeRequest('/'));

    expect(res.status).not.toBe(307);
  });
});
