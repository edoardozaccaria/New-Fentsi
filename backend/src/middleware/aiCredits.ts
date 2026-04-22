import { FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';
import { env } from '../config/env';

const redis = new Redis(env.REDIS_URL);

const ANONYMOUS_TTL = 60 * 60 * 24; // 24 hours

/**
 * Checks whether the requester has AI generation credits.
 *
 * - Anonymous users (user === null): 1 free generation per session_id, tracked in Redis.
 * - Free plan: must have ai_credits > 0 (checked via db, expects credit count on request context).
 * - Pro / Agency plans: unlimited.
 */
export async function aiCredits(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user;

  // --- Anonymous user ---
  if (!user) {
    const sessionId =
      (request.headers['x-session-id'] as string) ??
      (request.query as Record<string, string>)?.session_id;

    if (!sessionId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Missing session_id. Please provide a session identifier.',
      });
    }

    const redisKey = `anon_gen:${sessionId}`;
    const used = await redis.get(redisKey);

    if (used) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Free generation limit reached. Create an account to generate more event plans.',
      });
    }

    // Mark as used — will be set after successful generation by the controller,
    // but we optimistically reserve the slot here.
    await redis.set(redisKey, '1', 'EX', ANONYMOUS_TTL);
    return;
  }

  // --- Pro / Agency — unlimited ---
  if (user.plan === 'pro' || user.plan === 'agency') {
    return;
  }

  // --- Free plan — check ai_credits ---
  if (user.plan === 'free') {
    // The credit count is expected to be checked against the database.
    // We store remaining credits in Redis for fast access, keyed by user id.
    const creditsKey = `credits:${user.id}`;
    const remaining = await redis.get(creditsKey);

    // If no key exists the controller should hydrate from DB on first access.
    // A value of "0" means no credits left.
    if (remaining !== null && parseInt(remaining, 10) <= 0) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'No AI credits remaining. Upgrade to Pro for unlimited event plan generations.',
      });
    }

    return;
  }

  // Unknown plan — deny by default
  return reply.status(403).send({
    statusCode: 403,
    error: 'Forbidden',
    message: 'Your current plan does not support AI generation.',
  });
}
