import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface JwtPayload {
  sub: string;
  email: string;
  plan: string;
}

export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  request.user = null;

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    request.user = {
      id: decoded.sub,
      email: decoded.email,
      plan: decoded.plan,
    };
  } catch {
    // Invalid token — silently continue as unauthenticated
  }
}
