import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { getProfile, updateProfile, deleteAccount } from '../controllers/users.controller';

export default async function usersRoutes(app: FastifyInstance): Promise<void> {
  // All user routes require authentication
  app.addHook('preHandler', authenticate);

  // GET /users/me — get current user profile
  app.get('/users/me', getProfile);

  // PATCH /users/me — update profile (full_name, avatar_url)
  app.patch('/users/me', updateProfile);

  // DELETE /users/me — soft-delete account
  app.delete('/users/me', deleteAccount);
}
