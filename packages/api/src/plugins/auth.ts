import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createAuthMiddleware } from '../middleware/tenant-isolation/tenant-isolation.middleware';
import { createRequestLogger } from '../config/logger/logger';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export interface AuthPluginOptions {
  jwtSecret: string;
}

/**
 * Auth plugin that registers the 'authenticate' decorator and
 * enriches the request logger with tenant_id after successful authentication.
 */
const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, opts) => {
  const authenticate = createAuthMiddleware(opts.jwtSecret);

  // Decorate app so routes can access via app.authenticate
  app.decorate('authenticate', authenticate);

  // After authentication, enrich logger with tenant_id
  app.addHook('preHandler', async (request) => {
    if (request.user?.tenant_id) {
      request.log = createRequestLogger(request.log, {
        request_id: request.requestId,
        tenant_id: request.user.tenant_id,
      });
    }
  });
};

export const auth = fp(authPlugin, {
  name: 'auth',
});
