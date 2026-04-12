import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  eventType: z.string(),
  eventDate: z.string().nullable(),
  guestCount: z.number().int().min(10).max(500),
  city: z.string().min(1),
  venuePreference: z.string().nullable(),
  budgetUsd: z.number().min(5_000).max(500_000),
  stylePreferences: z.array(z.string()),
  requiredServices: z.array(z.string()).min(1),
  specialRequests: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPrompt(data: z.infer<typeof RequestSchema>): string {
  return `You are an expert event planning concierge. Generate 3 realistic (AI-fictional) supplier suggestions for EACH service category listed below.

EVENT DETAILS:
- Type: ${data.eventType}
- Date: ${data.eventDate ?? 'TBD'}
- Guests: ${data.guestCount}
- City: ${data.city}
- Venue preference: ${data.venuePreference ?? 'no preference'}
- Budget: $${data.budgetUsd.toLocaleString('en-US')} USD total
- Style: ${data.stylePreferences.join(', ') || 'flexible'}
- Special requests: ${data.specialRequests || 'none'}

SERVICE CATEGORIES TO FILL:
${data.requiredServices.map((s) => `- ${s}`).join('\n')}

OUTPUT FORMAT:
Emit one JSON object per line (NDJSON). Each line must be:
{"type":"supplier","data":{"name":"...","category":"...","description":"...","estimatedPriceUsd":XXXX,"city":"...","isVerified":false}}

Rules:
- Output ONLY raw JSON lines. No markdown, no prose, no code fences.
- Generate exactly 3 suppliers per service category listed above.
- "category" must exactly match the service name from the list above.
- "estimatedPriceUsd" must be a realistic number proportional to the budget.
- "city" must match the event city: ${data.city}
- All names and descriptions must be fictional but realistic.
- After all suppliers, emit: {"type":"done","status":"ok"}
`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // --- Parse input ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // --- Auth check ---
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  // We use the service-role key on server to verify session via cookie header
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Use the anon key with the user's access token if provided
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {},
  });

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return Response.json(
      { error: 'Unauthorized — please sign in.' },
      { status: 401 }
    );
  }

  // --- Anthropic streaming ---
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const encoder = new TextEncoder();
  const collected: Array<{
    name: string;
    category: string;
    description: string;
    estimatedPriceUsd: number;
    city: string;
    isVerified: boolean;
  }> = [];
  let eventId: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: buildPrompt(data) }],
        });

        let lineBuffer = '';

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            lineBuffer += chunk.delta.text;

            // Parse complete lines as they arrive
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                const parsed = JSON.parse(trimmed);
                if (parsed.type === 'supplier' && parsed.data) {
                  collected.push(parsed.data);
                  controller.enqueue(encoder.encode(trimmed + '\n'));
                }
                // Don't forward "done" yet — we emit it after saving
              } catch {
                // Partial JSON — skip
              }
            }
          }
        }

        // Flush remaining buffer
        if (lineBuffer.trim()) {
          try {
            const parsed = JSON.parse(lineBuffer.trim());
            if (parsed.type === 'supplier' && parsed.data) {
              collected.push(parsed.data);
              controller.enqueue(encoder.encode(lineBuffer.trim() + '\n'));
            }
          } catch {
            // ignore
          }
        }

        // --- Save to Supabase ---
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: eventRow, error: eventError } = await supabaseAdmin
          .from('events')
          .insert({
            user_id: user.id,
            event_type: data.eventType,
            event_date: data.eventDate,
            guest_count: data.guestCount,
            city: data.city,
            venue_preference: data.venuePreference,
            budget_usd: data.budgetUsd,
            style_preferences: data.stylePreferences,
            required_services: data.requiredServices,
            special_requests: data.specialRequests ?? null,
          })
          .select('id')
          .single();

        if (eventError || !eventRow) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                error: 'Failed to save event.',
              }) + '\n'
            )
          );
          controller.close();
          return;
        }

        eventId = eventRow.id as string;

        if (collected.length > 0) {
          await supabaseAdmin.from('event_suppliers').insert(
            collected.map((s) => ({
              event_id: eventId,
              name: s.name,
              category: s.category,
              description: s.description,
              estimated_price_usd: s.estimatedPriceUsd,
              city: s.city,
              is_verified: false,
            }))
          );
        }

        // Emit done
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'done', eventId }) + '\n')
        );
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal error';
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: 'error', error: message }) + '\n'
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
