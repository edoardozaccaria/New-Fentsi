import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Application-level error with an explicit HTTP status code.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/**
 * Global Fastify error handler.
 *
 * Attach via `app.setErrorHandler(errorHandler)`.
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // --- Zod validation errors ---
  if (error instanceof ZodError) {
    const formatted = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    reply.status(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: 'Request validation failed',
      details: formatted,
    });
    return;
  }

  // --- Known application errors ---
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
    return;
  }

  // --- Fastify-native errors (e.g. 404, payload too large) ---
  if ('statusCode' in error && typeof (error as FastifyError).statusCode === 'number') {
    const fastifyErr = error as FastifyError;
    reply.status(fastifyErr.statusCode!).send({
      statusCode: fastifyErr.statusCode,
      error: fastifyErr.name,
      message: fastifyErr.message,
    });
    return;
  }

  // --- Unknown / unexpected errors ---
  request.log.error(
    { err: error, reqId: request.id, url: request.url, method: request.method },
    'Unhandled error',
  );

  reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.',
  });
}
