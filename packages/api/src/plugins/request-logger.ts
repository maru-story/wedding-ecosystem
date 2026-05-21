import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createRequestLogger } from '../config/logger/logger';

/**
 * Plugin to enrich the request logger with request_id for structured tracing.
 */
const requestLoggerPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request) => {
    const requestId = request.requestId || request.headers['x-request-id'];
    if (requestId) {
      request.log = createRequestLogger(request.log, { request_id: requestId as string });
    }
  });
};

export const requestLogger = fp(requestLoggerPlugin, {
  name: 'request-logger',
});
