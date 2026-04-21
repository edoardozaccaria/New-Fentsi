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
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockStore
    );

    const { createSupabaseServerClient } = await import('./server');
    const client = await createSupabaseServerClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(mockStore.getAll).toHaveBeenCalled();
  });
});
