import { FastifyInstance } from 'fastify';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', authController.register);
  fastify.post('/auth/login', authController.login);
  fastify.post('/auth/logout', authController.logout);
  fastify.post('/auth/refresh', authController.refresh);
  fastify.post('/auth/forgot-password', authController.forgotPassword);
  fastify.post('/auth/reset-password', authController.resetPassword);
  fastify.post('/auth/verify-email', authController.verifyEmail);

  fastify.get('/auth/me', {
    preHandler: [authenticate],
  }, authController.getMe);
}
