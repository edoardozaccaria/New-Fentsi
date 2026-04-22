import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { requestQuote, listQuotes } from '../controllers/quotes.controller';

export default async function quotesRoutes(app: FastifyInstance): Promise<void> {
  // All quote routes require authentication
  app.addHook('preHandler', authenticate);

  // POST /plans/:id/vendors/:vid/quote — request a quote from a vendor
  app.post('/plans/:id/vendors/:vid/quote', requestQuote);

  // GET /plans/:id/quotes — list all quote requests for a plan
  app.get('/plans/:id/quotes', listQuotes);
}
