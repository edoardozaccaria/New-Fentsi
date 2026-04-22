import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendEmailQueue } from '../config/queue';

const COORDINATION_PRICE = 99.0; // EUR

// ─── Purchase Coordination ───────────────────────────────────────────────────

interface CoordinationParams {
  Params: { id: string };
  Body: { notes?: string };
}

export async function purchaseCoordination(
  request: FastifyRequest<CoordinationParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id: planId } = request.params;
  const { notes } = (request.body as { notes?: string }) ?? {};

  // Verify plan ownership
  const plan = await prisma.eventPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  if (plan.coordination_purchased) {
    throw new AppError('Coordination has already been purchased for this plan', 409);
  }

  // Create the coordination order and mark the plan in a transaction
  const order = await prisma.$transaction(async (tx) => {
    const coordinationOrder = await tx.coordinationOrder.create({
      data: {
        plan_id: planId,
        user_id: user.id,
        package_price: COORDINATION_PRICE,
        notes: notes?.trim() ?? null,
        status: 'pending',
      },
    });

    await tx.eventPlan.update({
      where: { id: planId },
      data: { coordination_purchased: true },
    });

    return coordinationOrder;
  });

  // Fetch user details for the notification email
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { full_name: true, email: true },
  });

  // Queue coordination confirmation email
  await sendEmailQueue.add('coordination-confirmation', {
    type: 'coordination' as const,
    to: dbUser?.email ?? '',
    data: {
      planTitle: plan.title,
      orderId: order.id,
      userName: dbUser?.full_name ?? 'Fentsi User',
    },
  });

  reply.status(201).send(order);
}

// ─── Get Order ───────────────────────────────────────────────────────────────

interface OrderParams {
  Params: { orderId: string };
}

export async function getOrder(
  request: FastifyRequest<OrderParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { orderId } = request.params;

  const order = await prisma.coordinationOrder.findUnique({
    where: { id: orderId },
    include: {
      plan: {
        select: {
          id: true,
          title: true,
          event_type: true,
          event_date: true,
          location_city: true,
        },
      },
      assignee: {
        select: { id: true, full_name: true, email: true },
      },
    },
  });

  if (!order || order.user_id !== user.id) {
    throw new AppError('Order not found', 404);
  }

  reply.send(order);
}
