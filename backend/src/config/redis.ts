import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redis.on("connect", () => {
  if (env.NODE_ENV === "development") {
    console.log(
      "[redis] Connected to",
      env.REDIS_URL.replace(/\/\/.*@/, "//<credentials>@"),
    );
  }
});

redis.on("error", (err) => {
  console.error("[redis] Connection error:", err.message);
});

/**
 * Gracefully disconnect Redis on process termination.
 */
async function shutdown() {
  await redis.quit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
