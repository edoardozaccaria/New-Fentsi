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
    const { createSupabaseServerClient } =
      await import('@/lib/supabase/server');
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
    const { createSupabaseServerClient } =
      await import('@/lib/supabase/server');
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
