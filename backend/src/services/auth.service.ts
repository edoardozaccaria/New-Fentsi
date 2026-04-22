import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/database';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createAccessToken(user: { id: string; email: string; plan: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, plan: user.plan },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

function excludePasswordHash<T extends { password_hash: string }>(
  user: T,
): Omit<T, 'password_hash'> {
  const { password_hash, ...rest } = user;
  return rest;
}

// ─── Register ──────────────────────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  full_name: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, password_hash, full_name },
  });

  // Create email verification token
  const tokenPlain = generateToken();
  const token_hash = hashToken(tokenPlain);
  const expires_at = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await prisma.emailVerificationToken.create({
    data: { user_id: user.id, token_hash, expires_at },
  });

  return {
    user: excludePasswordHash(user),
    verificationToken: tokenPlain,
  };
}

// ─── Login ─────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  ip: string,
  userAgent: string,
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.is_active) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = createAccessToken(user);

  const refreshTokenPlain = generateToken();
  const token_hash = hashToken(refreshTokenPlain);
  const expires_at = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash,
      expires_at,
      ip_address: ip,
      user_agent: userAgent,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenPlain,
    user: excludePasswordHash(user),
  };
}

// ─── Logout ────────────────────────────────────────────────────────────────────

export async function logout(refreshToken: string) {
  const token_hash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: { token_hash, revoked_at: null },
  });

  if (stored) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });
  }
}

// ─── Refresh Tokens ────────────────────────────────────────────────────────────

export async function refreshTokens(
  oldRefreshToken: string,
  ip: string,
  userAgent: string,
) {
  const oldHash = hashToken(oldRefreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: { token_hash: oldHash },
    include: { user: true },
  });

  if (!stored) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (stored.revoked_at) {
    // Possible token reuse attack — revoke all tokens for the user
    await prisma.refreshToken.updateMany({
      where: { user_id: stored.user_id, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    throw new AppError('Refresh token already used — all sessions revoked', 401);
  }

  if (stored.expires_at < new Date()) {
    throw new AppError('Refresh token expired', 401);
  }

  // Rotate: revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked_at: new Date() },
  });

  // Issue new tokens
  const user = stored.user;
  const accessToken = createAccessToken(user);

  const newRefreshPlain = generateToken();
  const newHash = hashToken(newRefreshPlain);
  const expires_at = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: newHash,
      expires_at,
      ip_address: ip,
      user_agent: userAgent,
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshPlain,
  };
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return silently to prevent email enumeration
    return null;
  }

  const tokenPlain = generateToken();
  const token_hash = hashToken(tokenPlain);
  const expires_at = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await prisma.passwordResetToken.create({
    data: { user_id: user.id, token_hash, expires_at },
  });

  return { token: tokenPlain, user };
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(tokenPlain: string, newPassword: string) {
  const token_hash = hashToken(tokenPlain);

  const stored = await prisma.passwordResetToken.findFirst({
    where: { token_hash },
    include: { user: true },
  });

  if (!stored) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  if (stored.used_at) {
    throw new AppError('Reset token has already been used', 400);
  }

  if (stored.expires_at < new Date()) {
    throw new AppError('Reset token has expired', 400);
  }

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.user_id },
      data: { password_hash },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { used_at: new Date() },
    }),
    // Revoke all refresh tokens for security
    prisma.refreshToken.updateMany({
      where: { user_id: stored.user_id, revoked_at: null },
      data: { revoked_at: new Date() },
    }),
  ]);
}

// ─── Verify Email ──────────────────────────────────────────────────────────────

export async function verifyEmail(tokenPlain: string) {
  const token_hash = hashToken(tokenPlain);

  const stored = await prisma.emailVerificationToken.findFirst({
    where: { token_hash },
  });

  if (!stored) {
    throw new AppError('Invalid verification token', 400);
  }

  if (stored.expires_at < new Date()) {
    throw new AppError('Verification token has expired', 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.user_id },
      data: { is_verified: true },
    }),
    prisma.emailVerificationToken.delete({
      where: { id: stored.id },
    }),
  ]);
}

// ─── Get Me ────────────────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return excludePasswordHash(user);
}

// ─── App Error ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
