import { describe, it, expect, vi } from 'vitest';
import { discoverSuppliers } from './supplier-discovery';
import * as fsq from './foursquare';
import * as tavily from './tavily';

const FAKE_FSQ = [{ name: 'Villa Reale', source: 'foursquare' as const }];
const FAKE_TAV = [{ name: 'Luca Rossi Foto', source: 'tavily' as const }];

vi.mock('./foursquare', () => ({ searchFoursquarePlaces: vi.fn() }));
vi.mock('./tavily', () => ({ searchTavilySuppliers: vi.fn() }));

describe('discoverSuppliers', () => {
  it('routes venue and catering to Foursquare', async () => {
    vi.mocked(fsq.searchFoursquarePlaces).mockResolvedValue(FAKE_FSQ as any);
    vi.mocked(tavily.searchTavilySuppliers).mockResolvedValue([]);

    const result = await discoverSuppliers(['venue', 'catering'], 'Milano', {
      foursquareKey: 'FSQ',
      tavilyKey: 'TAV',
    });

    expect(result.venue).toEqual(FAKE_FSQ);
    expect(result.catering).toEqual(FAKE_FSQ);
    expect(fsq.searchFoursquarePlaces).toHaveBeenCalledWith(
      'location per eventi',
      'Milano',
      'FSQ',
      5
    );
  });

  it('routes photography to Tavily', async () => {
    vi.mocked(fsq.searchFoursquarePlaces).mockResolvedValue([]);
    vi.mocked(tavily.searchTavilySuppliers).mockResolvedValue(FAKE_TAV as any);

    const result = await discoverSuppliers(['photography'], 'Roma', {
      foursquareKey: 'FSQ',
      tavilyKey: 'TAV',
    });

    expect(result.photography).toEqual(FAKE_TAV);
    expect(tavily.searchTavilySuppliers).toHaveBeenCalledWith(
      'fotografo eventi',
      'Roma',
      'TAV',
      5
    );
  });

  it('returns empty arrays gracefully when both APIs return nothing', async () => {
    vi.mocked(fsq.searchFoursquarePlaces).mockResolvedValue([]);
    vi.mocked(tavily.searchTavilySuppliers).mockResolvedValue([]);

    const result = await discoverSuppliers(['music_dj'], 'Napoli', {
      foursquareKey: 'FSQ',
      tavilyKey: 'TAV',
    });

    expect(result.music_dj).toEqual([]);
  });
});
