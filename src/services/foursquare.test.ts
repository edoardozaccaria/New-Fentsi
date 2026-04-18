import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchFoursquarePlaces } from './foursquare';

const MOCK_RESPONSE = {
  results: [
    {
      name: 'Villa Reale',
      location: { formatted_address: 'Via Roma 1, Milano' },
      rating: 8.5,
      website: 'https://villareale.it',
      fsq_id: 'abc123',
    },
    {
      name: 'Palazzo Borromeo',
      location: { formatted_address: 'Corso Venezia 5, Milano' },
      rating: 9.1,
      website: undefined,
      fsq_id: 'def456',
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_RESPONSE,
  } as Response);
});

describe('searchFoursquarePlaces', () => {
  it('returns mapped RealSupplierCandidate array', async () => {
    const results = await searchFoursquarePlaces(
      'event venue',
      'Milano',
      'TEST_KEY'
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      name: 'Villa Reale',
      address: 'Via Roma 1, Milano',
      rating: 8.5,
      website: 'https://villareale.it',
      snippet: undefined,
      source: 'foursquare',
    });
  });

  it('returns empty array when fetch fails', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429 } as Response);
    const results = await searchFoursquarePlaces('venue', 'Roma', 'BAD_KEY');
    expect(results).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const results = await searchFoursquarePlaces('venue', 'Roma', 'TEST_KEY');
    expect(results).toEqual([]);
  });
});
