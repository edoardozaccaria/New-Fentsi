import { FastifyInstance } from 'fastify';
import { optionalAuth } from '../middleware/optionalAuth';
import { aiCredits } from '../middleware/aiCredits';
import { submitWizard, getStatus, submitSync } from '../controllers/wizard.controller';

export default async function wizardRoutes(app: FastifyInstance): Promise<void> {
  // POST /wizard/submit — async plan generation via queue
  app.post(
    '/wizard/submit',
    { preHandler: [optionalAuth, aiCredits] },
    submitWizard,
  );

  // GET /wizard/:submissionId/status — poll submission status
  app.get(
    '/wizard/:submissionId/status',
    { preHandler: [optionalAuth] },
    getStatus,
  );

  // POST /wizard/submit/sync — SSE streaming inline generation
  app.post(
    '/wizard/submit/sync',
    { preHandler: [optionalAuth, aiCredits] },
    submitSync,
  );
}
