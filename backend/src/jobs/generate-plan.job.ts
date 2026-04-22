import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { env } from '../config/env';

interface PlanGenerationPayload {
  submissionId: string;
}

/**
 * BullMQ worker for the 'plan-generation' queue.
 *
 * Receives a wizard submission ID, delegates to the wizard service
 * to generate the AI-powered event plan, and updates the submission
 * status on failure.
 */
const generatePlanWorker = new Worker<PlanGenerationPayload>(
  'plan-generation',
  async (job: Job<PlanGenerationPayload>) => {
    const { submissionId } = job.data;
    job.log(`Starting plan generation for submission ${submissionId}`);

    try {
      await job.updateProgress(10);

      // Lazy-import to avoid circular dependency at module load
      const { generatePlan } = await import('../services/wizard.service');

      await job.updateProgress(20);
      job.log('Calling wizardService.generatePlan');

      await generatePlan(submissionId);

      await job.updateProgress(100);
      job.log(`Plan generation completed for submission ${submissionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      job.log(`Plan generation failed: ${message}`);

      // Mark submission as failed so the client can poll and see the error
      await prisma.wizardSubmission.update({
        where: { id: submissionId },
        data: { status: 'failed' },
      });

      throw error; // Re-throw so BullMQ records the failure
    }
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60_000, // max 10 jobs per minute to protect API rate limits
    },
  },
);

generatePlanWorker.on('completed', (job) => {
  if (env.NODE_ENV === 'development') {
    console.log(`[worker:plan-generation] Job ${job.id} completed`);
  }
});

generatePlanWorker.on('failed', (job, err) => {
  console.error(
    `[worker:plan-generation] Job ${job?.id} failed:`,
    err.message,
  );
});

generatePlanWorker.on('error', (err) => {
  console.error('[worker:plan-generation] Worker error:', err.message);
});

export default generatePlanWorker;
