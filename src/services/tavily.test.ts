import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTavilySuppliers } from './tavily';

const MOCK_RESPONSE = {
  results: [
    {
      title: 'Luca Rossi Fotografia',
      url: 'https://lucarossifoto.it',
      content: 'Fotografo professionista a Milano, specializzato in matrimoni.',
    },
    {
      title: 'Studio Azzurro Photo',
      url: 'https://studioazzurro.it',
      content: 'Reportage fotografico per eventi aziendali e privati.',
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

describe('searchTavilySuppliers', () => {
  it('returns mapped RealSupplierCandidate array', async () => {
    const results = await searchTavilySuppliers(
      'fotografo matrimoni',
      'Milano',
      'TEST_KEY'
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      name: 'Luca Rossi Fotografia',
      address: undefined,
      rating: undefined,
      website: 'https://lucarossifoto.it',
      snippet: 'Fotografo professionista a Milano, specializzato in matrimoni.',
      source: 'tavily',
    });
  });

  it('returns empty array when fetch fails', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401 } as Response);
    const results = await searchTavilySuppliers('fotografo', 'Roma', 'BAD_KEY');
    expect(results).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    const results = await searchTavilySuppliers(
      'fotografo',
      'Roma',
      'TEST_KEY'
    );
    expect(results).toEqual([]);
  });
});
