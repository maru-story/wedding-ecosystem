import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createRequestLogger } from '../config/logger/logger';

/**
 * Sampling rate for request logging.
 * Controlled via REQUEST_LOG_SAMPLE_RATE environment variable (0.0–1.0).
 * Defaults to 0.1 (10% of requests) to avoid log volume issues.
 * Set to 1.0 to log all requests (useful in development).
 */
const SAMPLE_RATE = process.env.REQUEST_LOG_SAMPLE_RATE
  ? parseFloat(process.env.REQUEST_LOG_SAMPLE_RATE)
  : 0.1; // Default: log 10% of requests

/**
 * Plugin to enrich the request logger with request_id for structured tracing.
 * Applies sampling to limit log volume — only a fraction of requests are logged,
 * controlled by the SAMPLE_RATE constant above.
 */
const requestLoggerPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request) => {
    if (Math.random() > SAMPLE_RATE) {
      return; // Skip logging for this request
    }

    const requestId = request.requestId || request.headers['x-request-id'];
    if (requestId) {
      request.log = createRequestLogger(request.log, { request_id: requestId as string });
    }
  });
};

export const requestLogger = fp(requestLoggerPlugin, {
  name: 'request-logger',
});
