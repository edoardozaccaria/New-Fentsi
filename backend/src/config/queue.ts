import { Queue, QueueOptions } from "bullmq";
import { redis } from "./redis";
import { env } from "./env";

const defaultQueueOpts: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,     // Keep at most 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

/**
 * Queue for AI plan generation jobs.
 * Produces jobs when a wizard submission is created; consumed by the
 * plan-generation worker that calls Anthropic + Foursquare.
 */
export const planGenerationQueue = new Queue("plan-generation", {
  ...defaultQueueOpts,
  defaultJobOptions: {
    ...defaultQueueOpts.defaultJobOptions,
    attempts: 2, // AI calls are expensive — limit retries
  },
});

/**
 * Queue for transactional emails (verification, password reset, quotes).
 */
export const sendEmailQueue = new Queue("send-email", {
  ...defaultQueueOpts,
});

/**
 * Gracefully close queues on process termination.
 */
async function shutdown() {
  await Promise.all([
    planGenerationQueue.close(),
    sendEmailQueue.close(),
  ]);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (env.NODE_ENV === "development") {
  console.log("[queue] Initialized: plan-generation, send-email");
}
