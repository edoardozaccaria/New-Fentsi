import { FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/auth.service';
import { AppError } from '../services/auth.service';
import { env } from '../config/env';

// ─── Schemas (Zod-style inline validation) ─────────────────────────────────────

interface RegisterBody {
  email: string;
  password: string;
  full_name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  password: string;
}

interface VerifyEmailBody {
  token: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_COOKIE = 'fentsi_refresh';
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

function getClientIp(request: FastifyRequest): string {
  return (
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    request.ip
  );
}

// ─── Handlers ───────────────────────────────────────────────────────────────────

export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  try {
    const { email, password, full_name } = request.body;

    if (!email || !password || !full_name) {
      return reply.status(400).send({ error: 'email, password, and full_name are required' });
    }

    const result = await authService.register(email, password, full_name);

    return reply.status(201).send({
      user: result.user,
      verificationToken: result.verificationToken,
    });
  } catch (err) {
    return handleError(err, reply);
  }
}

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required' });
    }

    const ip = getClientIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';

    const result = await authService.login(email, password, ip, userAgent);

    setRefreshCookie(reply, result.refreshToken);

    return reply.send({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    return handleError(err, reply);
  }
}

export async function logout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearRefreshCookie(reply);

    return reply.send({ message: 'Logged out successfully' });
  } catch (err) {
    return handleError(err, reply);
  }
}

export async function refresh(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token provided' });
    }

    const ip = getClientIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';

    const result = await authService.refreshTokens(refreshToken, ip, userAgent);

    setRefreshCookie(reply, result.refreshToken);

    return reply.send({ accessToken: result.accessToken });
  } catch (err) {
    return handleError(err, reply);
  }
}

export async function forgotPassword(
  request: FastifyRequest<{ Body: ForgotPasswordBody }>,
  reply: FastifyReply,
) {
  try {
    const { email } = request.body;

    if (!email) {
      return reply.status(400).send({ error: 'email is required' });
    }

    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    return reply.send({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    return handleError(err, reply);
  }
}

export async function resetPassword(
  request: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply,
) {
  try {
    const { token, password } = request.body;

    if (!token || !password) {
      return reply.status(400).send({ error: 'token and password are required' });
    }

    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    await authService.resetPassword(token, password);

    return reply.send({ message: 'Password has been reset successfully' });
  } catch (err) {
    return handleError(err, reply);
  }
}

export async function verifyEmail(
  request: FastifyRequest<{ Body: VerifyEmailBody }>,
  reply: FastifyReply,
) {
  try {
    const { token } = request.body;

    if (!token) {
      return reply.status(400).send({ error: 'token is required' });
    }

    await authService.verifyEmail(token);

    return reply.send({ message: 'Email verified successfully' });
  } catch (err) {
    return handleError(err, reply);
  }
}

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const user = await authService.getMe(userId);

    return reply.send({ user });
  } catch (err) {
    return handleError(err, reply);
  }
}

// ─── Error Handler ──────────────────────────────────────────────────────────────

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({ error: err.message });
  }

  request_logger(err);
  return reply.status(500).send({ error: 'Internal server error' });
}

function request_logger(err: unknown) {
  console.error('[auth]', err instanceof Error ? err.message : err);
}
