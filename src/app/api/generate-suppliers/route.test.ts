import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: vi.fn(),
}));
vi.mock('@/lib/ai', () => ({
  buildPrompt: vi.fn(() => 'mock-prompt'),
}));
vi.mock('@/services/supplier-discovery', () => ({
  discoverSuppliers: vi.fn(async () => ({})),
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      stream: vi.fn(async function* () {}),
    },
  })),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

function makeRequest(body: object) {
  return new Request('http://localhost/api/generate-suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  eventType: 'wedding',
  eventDate: '2026-10-01',
  duration: 'full_day',
  guestCount: 80,
  city: 'Firenze',
  venuePreference: 'indoor',
  budgetUsd: 15000,
  stylePreferences: ['elegante'],
  requiredServices: ['catering'],
  specialRequirements: [],
  outputLanguage: 'it',
};

describe('POST /api/generate-suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    } as never);

    const { POST } = await import('./route');
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 402 when free user has already generated 1 plan', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-123' } } })) },
    } as never);

    let serviceCallCount = 0;
    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from: vi.fn(() => {
        serviceCallCount++;
        if (serviceCallCount === 1) {
          // profiles query
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
        // events count query
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ count: 1, error: null })),
          })),
        };
      }),
    } as never);

    const { POST } = await import('./route');
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('plan_limit_reached');
  });
});
