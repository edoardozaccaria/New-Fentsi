import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { purchaseCoordination, getOrder } from '../controllers/coordination.controller';

export default async function coordinationRoutes(app: FastifyInstance): Promise<void> {
  // All coordination routes require authentication
  app.addHook('preHandler', authenticate);

  // POST /plans/:id/coordination — purchase coordination for a plan
  app.post('/plans/:id/coordination', purchaseCoordination);

  // GET /coordination/:orderId — get coordination order status
  app.get('/coordination/:orderId', getOrder);
}
