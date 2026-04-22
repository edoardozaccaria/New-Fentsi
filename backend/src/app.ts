import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './routes/auth.routes';
import wizardRoutes from './routes/wizard.routes';
import plansRoutes from './routes/plans.routes';
import quotesRoutes from './routes/quotes.routes';
import coordinationRoutes from './routes/coordination.routes';
import adminRoutes from './routes/admin.routes';
import usersRoutes from './routes/users.routes';

// ─── Create Application ──────────────────────────────────────────────────────

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
    requestTimeout: 30_000,
  });

  // ── Plugins ────────────────────────────────────────────────────────────────

  app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-Id',
      'X-Requested-With',
    ],
  });

  app.register(cookie, {
    secret: env.JWT_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  app.register(rateLimit, generalLimiter);

  // ── Error Handler ──────────────────────────────────────────────────────────

  app.setErrorHandler(errorHandler);

  // ── Health Check ───────────────────────────────────────────────────────────

  app.get('/health', async (_request, reply) => {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── API Routes (v1) ───────────────────────────────────────────────────────

  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(wizardRoutes, { prefix: '/api/v1' });
  app.register(plansRoutes, { prefix: '/api/v1' });
  app.register(quotesRoutes, { prefix: '/api/v1' });
  app.register(coordinationRoutes, { prefix: '/api/v1' });
  app.register(adminRoutes, { prefix: '/api/v1' });
  app.register(usersRoutes, { prefix: '/api/v1' });

  // ── 404 Catch-all ──────────────────────────────────────────────────────────

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  return app;
}
