import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { buildPrompt } from '@/lib/ai';
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from '@/lib/rate-limit';
import type { PlanOverview } from '@/types/plan.types';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  eventType: z.string(),
  eventDate: z.string().nullable(),
  duration: z.string().default('full_day'),
  guestCount: z.number().int().min(10).max(500),
  city: z.string().min(1),
  venuePreference: z.string().nullable(),
  budgetUsd: z.number().min(500).max(500_000),
  stylePreferences: z.array(z.string()),
  requiredServices: z.array(z.string()).min(1),
  specialRequirements: z.array(z.string()).default([]),
  specialRequests: z.string().optional(),
  outputLanguage: z.string().default('it'),
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // --- Rate limit: 5 AI calls per minute per IP ---
  const rlKey = `generate-suppliers:${getRateLimitKey(request)}`;
  const rl = checkRateLimit(rlKey, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  let planOverview: PlanOverview | null = null;
  let eventId: string | null = null;

  const prompt = buildPrompt({
    eventType: data.eventType,
    date: data.eventDate,
    duration: data.duration,
    guestCount: data.guestCount,
    city: data.city,
    venuePreference: data.venuePreference,
    budgetEur: data.budgetUsd,
    stylePreferences: data.stylePreferences,
    requiredServices: data.requiredServices,
    specialRequirements: data.specialRequirements,
    specialRequests: data.specialRequests,
    outputLanguage: data.outputLanguage,
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });

        let lineBuffer = '';

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            lineBuffer += chunk.delta.text;

            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                const parsedLine = JSON.parse(trimmed);

                if (parsedLine.type === 'plan_overview' && parsedLine.data) {
                  planOverview = parsedLine.data as PlanOverview;
                  // Forward to client immediately so UI can render budget/alerts
                  controller.enqueue(encoder.encode(trimmed + '\n'));
                } else if (parsedLine.type === 'supplier' && parsedLine.data) {
                  collected.push(parsedLine.data);
                  controller.enqueue(encoder.encode(trimmed + '\n'));
                }
                // Don't forward "done" yet — emit after saving
              } catch {
                // Partial JSON — skip
              }
            }
          }
        }

        // Flush remaining buffer
        if (lineBuffer.trim()) {
          try {
            const parsedLine = JSON.parse(lineBuffer.trim());
            if (parsedLine.type === 'supplier' && parsedLine.data) {
              collected.push(parsedLine.data);
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
            // wizard v2 fields (require migration 002)
            output_language: data.outputLanguage,
            special_requirements: data.specialRequirements,
            duration: data.duration,
            plan_data: planOverview ?? null,
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
