import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import {
  adminGuard,
  listSubmissions,
  listPlans,
  listCoordination,
  updateCoordination,
} from '../controllers/admin.controller';

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  // All admin routes require authentication + admin check
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', adminGuard);

  // GET /admin/submissions — list all wizard submissions
  app.get('/admin/submissions', listSubmissions);

  // GET /admin/plans — list all event plans
  app.get('/admin/plans', listPlans);

  // GET /admin/coordination — list all coordination orders
  app.get('/admin/coordination', listCoordination);

  // PATCH /admin/coordination/:orderId — update a coordination order
  app.patch('/admin/coordination/:orderId', updateCoordination);
}
