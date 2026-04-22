import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ─── Get Profile ─────────────────────────────────────────────────────────────

export async function getProfile(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      plan: true,
      ai_credits: true,
      is_verified: true,
      created_at: true,
      updated_at: true,
      _count: {
        select: {
          event_plans: true,
          coordination_orders: true,
        },
      },
    },
  });

  if (!dbUser) {
    throw new AppError('User not found', 404);
  }

  reply.send(dbUser);
}

// ─── Update Profile ──────────────────────────────────────────────────────────

interface UpdateProfileBody {
  Body: {
    full_name?: string;
    avatar_url?: string;
  };
}

export async function updateProfile(
  request: FastifyRequest<UpdateProfileBody>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const body = request.body as Record<string, unknown>;

  const updateData: Record<string, unknown> = {};

  if (typeof body.full_name === 'string') {
    const trimmed = body.full_name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new AppError('Full name must be between 1 and 100 characters', 400);
    }
    updateData.full_name = trimmed;
  }

  if (typeof body.avatar_url === 'string') {
    updateData.avatar_url = body.avatar_url.trim() || null;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      plan: true,
      ai_credits: true,
      is_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  reply.send(updated);
}

// ─── Delete Account ──────────────────────────────────────────────────────────

export async function deleteAccount(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;

  // Soft-delete: mark as inactive and set deleted_at
  await prisma.user.update({
    where: { id: user.id },
    data: {
      is_active: false,
      deleted_at: new Date(),
    },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { user_id: user.id, revoked_at: null },
    data: { revoked_at: new Date() },
  });

  reply.status(204).send();
}
