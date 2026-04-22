import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

// ─── Admin Guard ─────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@fentsi.com';

export async function adminGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.user || request.user.email !== ADMIN_EMAIL) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }
}

// ─── List Submissions ────────────────────────────────────────────────────────

interface PaginationQuery {
  Querystring: { page?: string; limit?: string; status?: string };
}

export async function listSubmissions(
  request: FastifyRequest<PaginationQuery>,
  reply: FastifyReply,
): Promise<void> {
  const query = request.query as Record<string, string>;
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));
  const skip = (page - 1) * limit;

  const where = query.status
    ? { status: query.status as any }
    : {};

  const [submissions, total] = await Promise.all([
    prisma.wizardSubmission.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, full_name: true } },
        event_plan: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.wizardSubmission.count({ where }),
  ]);

  reply.send({
    data: submissions,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}

// ─── List Plans (admin) ──────────────────────────────────────────────────────

export async function listPlans(
  request: FastifyRequest<PaginationQuery>,
  reply: FastifyReply,
): Promise<void> {
  const query = request.query as Record<string, string>;
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));
  const skip = (page - 1) * limit;

  const where = query.status
    ? { status: query.status as any }
    : {};

  const [plans, total] = await Promise.all([
    prisma.eventPlan.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, full_name: true } },
        _count: { select: { vendors: true, quote_requests: true } },
      },
    }),
    prisma.eventPlan.count({ where }),
  ]);

  reply.send({
    data: plans,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}

// ─── List Coordination Orders ────────────────────────────────────────────────

export async function listCoordination(
  request: FastifyRequest<PaginationQuery>,
  reply: FastifyReply,
): Promise<void> {
  const query = request.query as Record<string, string>;
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));
  const skip = (page - 1) * limit;

  const where = query.status
    ? { status: query.status as any }
    : {};

  const [orders, total] = await Promise.all([
    prisma.coordinationOrder.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, full_name: true } },
        plan: { select: { id: true, title: true, event_date: true, location_city: true } },
        assignee: { select: { id: true, full_name: true, email: true } },
      },
    }),
    prisma.coordinationOrder.count({ where }),
  ]);

  reply.send({
    data: orders,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}

// ─── Update Coordination Order ───────────────────────────────────────────────

interface UpdateCoordinationParams {
  Params: { orderId: string };
  Body: {
    status?: string;
    assigned_to?: string | null;
    notes?: string;
  };
}

export async function updateCoordination(
  request: FastifyRequest<UpdateCoordinationParams>,
  reply: FastifyReply,
): Promise<void> {
  const { orderId } = request.params;
  const body = request.body as Record<string, unknown>;

  const order = await prisma.coordinationOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError('Coordination order not found', 404);
  }

  const updateData: Record<string, unknown> = {};

  if (body.status) {
    const validStatuses = ['pending', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(body.status as string)) {
      throw new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400,
      );
    }
    updateData.status = body.status;
  }

  if (body.assigned_to !== undefined) {
    if (body.assigned_to) {
      // Verify the assignee exists
      const assignee = await prisma.user.findUnique({
        where: { id: body.assigned_to as string },
      });
      if (!assignee) {
        throw new AppError('Assignee user not found', 404);
      }
    }
    updateData.assigned_to = body.assigned_to;
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  const updated = await prisma.coordinationOrder.update({
    where: { id: orderId },
    data: updateData,
    include: {
      user: { select: { id: true, email: true, full_name: true } },
      plan: { select: { id: true, title: true } },
      assignee: { select: { id: true, full_name: true, email: true } },
    },
  });

  reply.send(updated);
}
