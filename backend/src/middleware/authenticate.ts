import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface JwtPayload {
  sub: string;
  email: string;
  plan: string;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    request.user = {
      id: decoded.sub,
      email: decoded.email,
      plan: decoded.plan,
    };
  } catch (err) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
