import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { env } from '../config/env';

type EmailJobType = 'quote-request' | 'verification' | 'password-reset' | 'coordination';

interface EmailJobPayload {
  type: EmailJobType;
  to: string;
  subject?: string;
  data: Record<string, unknown>;
}

/**
 * BullMQ worker for the 'send-email' queue.
 *
 * Routes each job to the appropriate email service method based on
 * the `type` field in the payload.
 */
const sendEmailWorker = new Worker<EmailJobPayload>(
  'send-email',
  async (job: Job<EmailJobPayload>) => {
    const { type, to, data } = job.data;
    job.log(`Processing ${type} email to ${to}`);

    // Lazy-import to avoid circular dependency at module load
    const emailService = await import('../services/email.service');

    switch (type) {
      case 'quote-request':
        await emailService.sendQuoteRequestEmail({
          to,
          vendorName: data.vendorName as string,
          planTitle: data.planTitle as string,
          userName: data.userName as string,
          userMessage: data.userMessage as string,
          eventDate: data.eventDate as string,
          guestCount: data.guestCount as number,
        });
        break;

      case 'verification':
        await emailService.sendVerificationEmail({
          to,
          fullName: data.fullName as string,
          verificationUrl: data.verificationUrl as string,
        });
        break;

      case 'password-reset':
        await emailService.sendPasswordResetEmail({
          to,
          fullName: data.fullName as string,
          resetUrl: data.resetUrl as string,
        });
        break;

      case 'coordination':
        await emailService.sendCoordinationEmail({
          to,
          planTitle: data.planTitle as string,
          orderId: data.orderId as string,
          userName: data.userName as string,
        });
        break;

      default:
        throw new Error(`Unknown email job type: ${type}`);
    }

    job.log(`${type} email sent successfully to ${to}`);
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

sendEmailWorker.on('completed', (job) => {
  if (env.NODE_ENV === 'development') {
    console.log(`[worker:send-email] Job ${job.id} completed`);
  }
});

sendEmailWorker.on('failed', (job, err) => {
  console.error(`[worker:send-email] Job ${job?.id} failed:`, err.message);
});

sendEmailWorker.on('error', (err) => {
  console.error('[worker:send-email] Worker error:', err.message);
});

export default sendEmailWorker;
