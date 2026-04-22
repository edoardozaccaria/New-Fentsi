import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import type { VendorResult } from './foursquare.service';

// ─── Types ────────────────────────────────────

export interface WizardData {
  event_type: string;
  event_date: string;
  guest_count: number;
  budget_total: number;
  budget_currency: string;
  location_city: string;
  venue_preference: string;
  aesthetic_style: string[] | Record<string, unknown>;
  top_priorities: string[] | Record<string, unknown>;
  services_wanted: string[];
  extra_notes?: string;
}

export interface BudgetBreakdownItem {
  category: string;
  amount: number;
  percent: number;
  reasoning: string;
}

export interface TimelineItem {
  month: string;
  title: string;
  tasks: string[];
}

export interface VendorScore {
  foursquare_id: string;
  score: number;
  reason: string;
}

export interface AIPlanResponse {
  title: string;
  ai_summary: string;
  style_notes: string;
  budget_breakdown: BudgetBreakdownItem[];
  timeline: TimelineItem[];
  ai_tips: string[];
  vendor_scores: VendorScore[];
}

export interface AIPlanResult {
  plan: AIPlanResponse;
  tokens_used: number;
}

// ─── Client ───────────────────────────────────

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `Sei Fentsi, un esperto pianificatore di eventi italiani. Il tuo compito è generare piani evento concreti, personalizzati e immediatamente utilizzabili. Non usare template generici. Ogni piano deve sembrare scritto specificamente per questo evento. Rispondi SOLO con JSON valido seguendo esattamente lo schema fornito.`;

// ─── Prompt Builder ───────────────────────────

function buildUserPrompt(
  wizardData: WizardData,
  vendors: VendorResult[],
): string {
  const vendorSummary = vendors.map((v) => ({
    foursquare_id: v.foursquare_id,
    name: v.name,
    vendor_type: v.vendor_type,
    category: v.category,
    price_range: v.price_range,
    rating: v.rating,
    city: v.city,
  }));

  return `Genera un piano evento completo basato su questi dati:

## Dati Evento
- Tipo: ${wizardData.event_type}
- Data: ${wizardData.event_date}
- Ospiti: ${wizardData.guest_count}
- Budget: €${wizardData.budget_total} (${wizardData.budget_currency})
- Città: ${wizardData.location_city}
- Preferenza location: ${wizardData.venue_preference}
- Stile estetico: ${JSON.stringify(wizardData.aesthetic_style)}
- Priorità: ${JSON.stringify(wizardData.top_priorities)}
- Servizi richiesti: ${wizardData.services_wanted.join(', ')}
${wizardData.extra_notes ? `- Note aggiuntive: ${wizardData.extra_notes}` : ''}

## Vendor Disponibili (da Foursquare)
${JSON.stringify(vendorSummary, null, 2)}

## Schema JSON Richiesto
Rispondi con SOLO questo JSON (nessun testo prima o dopo):
{
  "title": "Titolo creativo per l'evento",
  "ai_summary": "Riassunto dettagliato del piano (3-5 frasi, in italiano)",
  "style_notes": "Note dettagliate sullo stile e l'atmosfera consigliata (2-3 frasi)",
  "budget_breakdown": [
    {
      "category": "Nome categoria (es. Location, Catering, Fiori, ecc.)",
      "amount": 1500,
      "percent": 30,
      "reasoning": "Spiegazione specifica per questa allocazione"
    }
  ],
  "timeline": [
    {
      "month": "Mese Anno (es. Gennaio 2025)",
      "title": "Titolo fase",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ],
  "ai_tips": [
    "Consiglio 1 specifico per questo evento",
    "Consiglio 2",
    "Consiglio 3",
    "Consiglio 4",
    "Consiglio 5"
  ],
  "vendor_scores": [
    {
      "foursquare_id": "id del vendor",
      "score": 85,
      "reason": "Motivazione specifica per questo punteggio"
    }
  ]
}

IMPORTANTE:
- budget_breakdown deve sommare al budget totale di €${wizardData.budget_total}
- vendor_scores deve includere TUTTI i vendor elencati sopra
- timeline deve coprire dall'inizio della pianificazione fino all'evento
- ai_tips deve avere esattamente 5 consigli unici e specifici
- Ogni score deve essere tra 0 e 100`;
}

// ─── JSON Parsing ─────────────────────────────

function parseAIResponse(text: string): AIPlanResponse {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  // Validate required fields
  const required: (keyof AIPlanResponse)[] = [
    'title',
    'ai_summary',
    'style_notes',
    'budget_breakdown',
    'timeline',
    'ai_tips',
    'vendor_scores',
  ];

  for (const field of required) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Missing required field in AI response: ${field}`);
    }
  }

  if (!Array.isArray(parsed.budget_breakdown)) {
    throw new Error('budget_breakdown must be an array');
  }
  if (!Array.isArray(parsed.timeline)) {
    throw new Error('timeline must be an array');
  }
  if (!Array.isArray(parsed.ai_tips) || parsed.ai_tips.length < 5) {
    throw new Error('ai_tips must be an array with at least 5 items');
  }
  if (!Array.isArray(parsed.vendor_scores)) {
    throw new Error('vendor_scores must be an array');
  }

  return parsed as AIPlanResponse;
}

// ─── Generate Plan (non-streaming) ────────────

export async function generateEventPlan(
  wizardData: WizardData,
  vendors: VendorResult[],
): Promise<AIPlanResult> {
  const userPrompt = buildUserPrompt(wizardData, vendors);

  let lastError: Error | null = null;

  // Retry once on JSON parse failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in AI response');
      }

      const plan = parseAIResponse(textBlock.text);

      const tokensUsed =
        (response.usage?.input_tokens ?? 0) +
        (response.usage?.output_tokens ?? 0);

      return { plan, tokens_used: tokensUsed };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[AI] Attempt ${attempt + 1} failed:`,
        lastError.message,
      );

      // Only retry on JSON parse errors
      if (
        !(lastError instanceof SyntaxError) &&
        !lastError.message.includes('Missing required field') &&
        !lastError.message.includes('must be an array')
      ) {
        throw lastError;
      }
    }
  }

  throw new Error(
    `AI plan generation failed after 2 attempts: ${lastError?.message}`,
  );
}

// ─── Generate Plan (streaming) ────────────────

export async function* generateEventPlanStream(
  wizardData: WizardData,
  vendors: VendorResult[],
): AsyncGenerator<{ type: 'chunk'; text: string } | { type: 'done'; result: AIPlanResult }> {
  const userPrompt = buildUserPrompt(wizardData, vendors);

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      fullText += event.delta.text;
      yield { type: 'chunk', text: event.delta.text };
    }

    if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens;
    }
  }

  // Get final message for input tokens
  const finalMessage = await stream.finalMessage();
  inputTokens = finalMessage.usage?.input_tokens ?? 0;
  outputTokens = outputTokens || (finalMessage.usage?.output_tokens ?? 0);

  const plan = parseAIResponse(fullText);

  yield {
    type: 'done',
    result: {
      plan,
      tokens_used: inputTokens + outputTokens,
    },
  };
}

export default { generateEventPlan, generateEventPlanStream };
