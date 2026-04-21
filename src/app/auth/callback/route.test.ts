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
    const { createSupabaseServerClient } =
      await import('@/lib/supabase/server');
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
    const { createSupabaseServerClient } =
      await import('@/lib/supabase/server');
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { exchangeCodeForSession: exchange },
    });

    const { GET } = await import('./route');
    const url = new URL(
      'http://localhost:3000/auth/callback?code=abc123&next=%2Fcreate-event'
    );
    const res = await GET(new NextRequest(url));

    expect(res.headers.get('location')).toContain('/create-event');
  });

  it('redirects to /login?error=oauth when exchange fails', async () => {
    const exchange = vi
      .fn()
      .mockResolvedValue({ error: { message: 'bad code' } });
    const { createSupabaseServerClient } =
      await import('@/lib/supabase/server');
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
