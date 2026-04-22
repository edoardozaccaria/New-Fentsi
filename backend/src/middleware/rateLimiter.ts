import { RateLimitPluginOptions } from '@fastify/rate-limit';

/**
 * General API rate limiter: 100 requests per minute.
 */
export const generalLimiter: RateLimitPluginOptions = {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
  }),
};

/**
 * Auth endpoints rate limiter: 10 requests per minute.
 */
export const authLimiter: RateLimitPluginOptions = {
  max: 10,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Too many authentication attempts. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
  }),
};

/**
 * Wizard / AI generation rate limiter: 2 requests per hour per IP.
 */
export const wizardLimiter: RateLimitPluginOptions = {
  max: 2,
  timeWindow: '1 hour',
  keyGenerator: (request) => request.ip,
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `AI generation limit reached. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
  }),
};
