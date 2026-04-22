import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import {
  listPlans,
  getPlan,
  savePlan,
  deletePlan,
  generatePdf,
  selectVendor,
} from '../controllers/plans.controller';

export default async function plansRoutes(app: FastifyInstance): Promise<void> {
  // All plan routes require authentication
  app.addHook('preHandler', authenticate);

  // GET /plans — list user's plans with pagination
  app.get('/plans', listPlans);

  // GET /plans/:id — get single plan with vendors
  app.get('/plans/:id', getPlan);

  // POST /plans/:id/save — save plan to user account
  app.post('/plans/:id/save', savePlan);

  // DELETE /plans/:id — soft-delete (archive)
  app.delete('/plans/:id', deletePlan);

  // GET /plans/:id/pdf — generate and download PDF
  app.get('/plans/:id/pdf', generatePdf);

  // PATCH /plans/:id/vendors/:vid/select — toggle vendor selection
  app.patch('/plans/:id/vendors/:vid/select', selectVendor);
}
