import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendEmailQueue } from '../config/queue';

// ─── Request Quote ───────────────────────────────────────────────────────────

interface QuoteParams {
  Params: { id: string; vid: string };
  Body: { message: string };
}

export async function requestQuote(
  request: FastifyRequest<QuoteParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id: planId, vid: vendorId } = request.params;
  const { message } = request.body as { message: string };

  if (!message || message.trim().length < 10) {
    throw new AppError('Message must be at least 10 characters', 400);
  }

  // Verify plan ownership
  const plan = await prisma.eventPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  // Verify vendor belongs to this plan
  const vendor = await prisma.planVendor.findFirst({
    where: { id: vendorId, plan_id: planId },
  });
  if (!vendor) {
    throw new AppError('Vendor not found', 404);
  }

  // Check for duplicate pending quote
  const existingQuote = await prisma.quoteRequest.findFirst({
    where: {
      plan_id: planId,
      vendor_id: vendorId,
      user_id: user.id,
      status: 'pending',
    },
  });
  if (existingQuote) {
    throw new AppError('A quote request is already pending for this vendor', 409);
  }

  // Fetch user details for the email
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { full_name: true, email: true },
  });

  const quoteRequest = await prisma.quoteRequest.create({
    data: {
      plan_id: planId,
      user_id: user.id,
      vendor_id: vendorId,
      user_message: message.trim(),
      status: 'pending',
    },
  });

  // Queue email to vendor (if vendor has a contact email / website)
  if (vendor.website || vendor.phone) {
    await sendEmailQueue.add('quote-request', {
      type: 'quote-request' as const,
      to: dbUser?.email ?? '',
      data: {
        vendorName: vendor.name,
        planTitle: plan.title,
        userName: dbUser?.full_name ?? 'Fentsi User',
        userMessage: message.trim(),
        eventDate: plan.event_date,
        guestCount: plan.guest_count,
      },
    });
  }

  reply.status(201).send(quoteRequest);
}

// ─── List Quotes ─────────────────────────────────────────────────────────────

interface ListQuotesParams {
  Params: { id: string };
}

export async function listQuotes(
  request: FastifyRequest<ListQuotesParams>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user!;
  const { id: planId } = request.params;

  // Verify plan ownership
  const plan = await prisma.eventPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.user_id !== user.id) {
    throw new AppError('Plan not found', 404);
  }

  const quotes = await prisma.quoteRequest.findMany({
    where: { plan_id: planId },
    orderBy: { created_at: 'desc' },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          vendor_type: true,
          phone: true,
          website: true,
        },
      },
    },
  });

  reply.send({ data: quotes });
}
