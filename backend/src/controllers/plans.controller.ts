import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { redis } from '../config/redis';

// ─── List Plans ──────────────────────────────────────────────────────────────

interface ListQuery {
  Querystring: { page?: string; limit?: string };
}

export async function listPlans(
  request: FastifyRequest<ListQuery>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const query = request.query as Record<string, string>;
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20', 10)));
  const skip = (page - 1) * limit;

  const [plans, total] = await Promise.all([
    prisma.eventPlan.findMany({
      where: { user_id: user.id, status: { not: 'archived' } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        vendors: { select: { id: true, name: true, vendor_type: true, is_selected: true } },
      },
    }),
    prisma.eventPlan.count({
      where: { user_id: user.id, status: { not: 'archived' } },
    }),
  ]);

  reply.send({
    data: plans,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
}

// ─── Get Plan ────────────────────────────────────────────────────────────────

interface PlanParams {
  Params: { id: string };
}

export async function getPlan(
  request: FastifyRequest<PlanParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id } = request.params;

  const plan = await prisma.eventPlan.findUnique({
    where: { id },
    include: {
      vendors: true,
      wizard_submission: {
        select: {
          event_type: true,
          venue_preference: true,
          aesthetic_style: true,
          top_priorities: true,
          services_wanted: true,
          extra_notes: true,
        },
      },
    },
  });

  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  if (plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  reply.send(plan);
}

// ─── Save Plan ───────────────────────────────────────────────────────────────

export async function savePlan(
  request: FastifyRequest<PlanParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id } = request.params;

  const plan = await prisma.eventPlan.findUnique({ where: { id } });

  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  // Allow saving if the plan has no owner yet (anonymous generation) or belongs to this user
  if (plan.user_id && plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  // If user is on the free plan, deduct an AI credit
  if (user.plan === 'free' && plan.status === 'draft' && !plan.user_id) {
    const creditsKey = `credits:${user.id}`;
    const remaining = await redis.get(creditsKey);

    if (remaining !== null) {
      const current = parseInt(remaining, 10);
      if (current <= 0) {
        throw new AppError(
          'No AI credits remaining. Upgrade to Pro for unlimited saves.',
          403,
        );
      }
      await redis.decr(creditsKey);
    } else {
      // Hydrate from DB then decrement
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser && dbUser.ai_credits <= 0) {
        throw new AppError(
          'No AI credits remaining. Upgrade to Pro for unlimited saves.',
          403,
        );
      }
      if (dbUser) {
        await redis.set(creditsKey, String(dbUser.ai_credits - 1));
      }
    }

    // Also decrement in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { ai_credits: { decrement: 1 } },
    });
  }

  const updated = await prisma.eventPlan.update({
    where: { id },
    data: {
      user_id: user.id,
      status: 'saved',
    },
  });

  reply.send(updated);
}

// ─── Delete Plan ─────────────────────────────────────────────────────────────

export async function deletePlan(
  request: FastifyRequest<PlanParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id } = request.params;

  const plan = await prisma.eventPlan.findUnique({ where: { id } });

  if (!plan || plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  await prisma.eventPlan.update({
    where: { id },
    data: { status: 'archived' },
  });

  reply.status(204).send();
}

// ─── Generate PDF ────────────────────────────────────────────────────────────

export async function generatePdf(
  request: FastifyRequest<PlanParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id } = request.params;

  const plan = await prisma.eventPlan.findUnique({
    where: { id },
    include: { vendors: true },
  });

  if (!plan || plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  const { generatePlanPdf } = await import('../services/pdf.service');
  const pdfBuffer = await generatePlanPdf(plan);

  reply
    .header('Content-Type', 'application/pdf')
    .header(
      'Content-Disposition',
      `attachment; filename="fentsi-plan-${plan.id.slice(0, 8)}.pdf"`,
    )
    .send(pdfBuffer);
}

// ─── Select Vendor ───────────────────────────────────────────────────────────

interface VendorSelectParams {
  Params: { id: string; vid: string };
}

export async function selectVendor(
  request: FastifyRequest<VendorSelectParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id, vid } = request.params;

  const plan = await prisma.eventPlan.findUnique({ where: { id } });

  if (!plan || plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  const vendor = await prisma.planVendor.findFirst({
    where: { id: vid, plan_id: id },
  });

  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  const updated = await prisma.planVendor.update({
    where: { id: vid },
    data: { is_selected: !vendor.is_selected },
  });

  reply.send(updated);
}
