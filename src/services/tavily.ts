import type { RealSupplierCandidate } from '@/types/supplier-discovery.types';

const TAVILY_URL = 'https://api.tavily.com/search';

export async function searchTavilySuppliers(
  query: string,
  city: string,
  apiKey: string,
  maxResults = 5
): Promise<RealSupplierCandidate[]> {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} ${city}`,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
      }),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      results: Array<{ title: string; url: string; content?: string }>;
    };

    return (json.results ?? []).map((r) => ({
      name: r.title,
      address: undefined,
      rating: undefined,
      website: r.url,
      snippet: r.content,
      source: 'tavily' as const,
    }));
  } catch {
    return [];
  }
}
