import { FastifyRequest, FastifyReply } from 'fastify';
import { wizardSchema } from '../validators/wizard.schema';
import { planGenerationQueue } from '../config/queue';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ─── Submit (async via queue) ────────────────────────────────────────────────

interface SubmitBody {
  Body: Record<string, unknown>;
}

export async function submitWizard(
  request: FastifyRequest<SubmitBody>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = wizardSchema.parse(request.body);

  const userId = request.user?.id ?? null;
  const sessionId =
    (request.headers['x-session-id'] as string) ??
    (request.query as Record<string, string>)?.session_id ??
    null;

  // Create wizard submission
  const submission = await prisma.wizardSubmission.create({
    data: {
      user_id: userId,
      session_id: sessionId,
      event_type: parsed.event_type as any,
      event_date: parsed.event_date,
      guest_count: parsed.guest_count,
      budget_total: parsed.budget_total,
      location_city: parsed.location_city,
      venue_preference: parsed.venue_preference as any,
      aesthetic_style: parsed.aesthetic_style,
      top_priorities: parsed.top_priorities,
      services_wanted: parsed.services_wanted,
      extra_notes: parsed.extra_notes ?? null,
      status: 'pending',
    },
  });

  // Enqueue the plan generation job
  await planGenerationQueue.add(
    'generate-plan',
    { submissionId: submission.id },
    { jobId: `plan-${submission.id}` },
  );

  reply.status(202).send({
    submission_id: submission.id,
    status: 'pending',
  });
}

// ─── Get Status (polling) ────────────────────────────────────────────────────

interface StatusParams {
  Params: { submissionId: string };
}

export async function getStatus(
  request: FastifyRequest<StatusParams>,
  reply: FastifyReply,
): Promise<void> {
  const { submissionId } = request.params;

  const submission = await prisma.wizardSubmission.findUnique({
    where: { id: submissionId },
    include: { event_plan: true },
  });

  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  // If the user is authenticated, verify ownership (anonymous users check session)
  if (request.user && submission.user_id && submission.user_id !== request.user.id) {
    throw new AppError('Submission not found', 404);
  }

  reply.send({
    submission_id: submission.id,
    status: submission.status,
    plan_id: submission.event_plan?.id ?? null,
  });
}

// ─── Submit Sync (not implemented — use async /submit + /status polling) ──────

export async function submitSync(
  _request: FastifyRequest<SubmitBody>,
  reply: FastifyReply,
): Promise<void> {
  reply.status(501).send({
    statusCode: 501,
    error: 'Not Implemented',
    message: 'Use POST /wizard/submit and poll GET /wizard/:submissionId/status',
  });
}
