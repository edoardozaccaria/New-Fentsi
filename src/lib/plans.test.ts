import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: vi.fn(),
}));

import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getUserPlanStatus } from './plans';

function makeDb(tier: string, count: number) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { subscription_tier: tier },
                error: null,
              })),
            })),
          })),
        };
      }
      // events table
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ count, error: null })),
        })),
      };
    }),
  };
}

function makeDbWithProfileError(errorMsg: string) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: null,
                error: { message: errorMsg },
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ count: 0, error: null })),
        })),
      };
    }),
  };
}

function makeDbWithCountError(errorMsg: string) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { subscription_tier: 'free' },
                error: null,
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ count: null, error: { message: errorMsg } })),
        })),
      };
    }),
  };
}

describe('getUserPlanStatus', () => {
  it('free user with 0 events can create', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('free', 0) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'free', eventsCount: 0, canCreateEvent: true });
  });

  it('free user with 1 event cannot create', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('free', 1) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'free', eventsCount: 1, canCreateEvent: false });
  });

  it('pro user with 15 events can create', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('pro', 15) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'pro', eventsCount: 15, canCreateEvent: true });
  });

  it('single user with 1 event cannot create (same limit as free)', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDb('single', 1) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const status = await getUserPlanStatus('user-1');
    expect(status).toEqual({ tier: 'single', eventsCount: 1, canCreateEvent: false });
  });

  it('throws when profile query fails', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDbWithProfileError('connection timeout') as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    await expect(getUserPlanStatus('user-1')).rejects.toThrow('Failed to fetch profile');
  });

  it('throws when events count query fails', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeDbWithCountError('query failed') as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    await expect(getUserPlanStatus('user-1')).rejects.toThrow('Failed to fetch events count');
  });
});
