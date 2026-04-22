import { buildApp } from './app';
import { env } from './config/env';

// ─── Start Workers ───────────────────────────────────────────────────────────

async function startWorkers(): Promise<void> {
  // Importing the worker modules starts them automatically
  const generatePlanWorker = (await import('./jobs/generate-plan.job')).default;
  const sendEmailWorker = (await import('./jobs/send-quote.job')).default;

  console.log('[server] Workers started: plan-generation, send-email');

  // Return a cleanup function via process event
  const shutdown = async () => {
    console.log('[server] Shutting down workers...');
    await Promise.all([
      generatePlanWorker.close(),
      sendEmailWorker.close(),
    ]);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const app = buildApp();

  // Start BullMQ workers
  await startWorkers();

  // Start the HTTP server
  try {
    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
    console.log(`[server] Fentsi API running at ${address}`);
    console.log(`[server] Environment: ${env.NODE_ENV}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // ── Graceful Shutdown ──────────────────────────────────────────────────────

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully...`);

    try {
      await app.close();
      console.log('[server] HTTP server closed');
    } catch (err) {
      console.error('[server] Error during shutdown:', err);
    }

    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] Fatal error during startup:', err);
  process.exit(1);
});
