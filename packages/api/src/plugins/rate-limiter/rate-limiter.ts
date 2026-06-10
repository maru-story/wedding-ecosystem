import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ErrorCode } from '@wedding/shared';
import { getCacheClient } from '../../config/redis/redis';

// --- Types ---

export interface RateLimitCategory {
  maxRequests: number;
  windowSeconds: number;
}

export interface RouteCategory {
  prefix: string;
  category: string;
}

export interface RateLimiterPluginOptions {
  categories?: Record<string, RateLimitCategory>;
  routeCategories?: RouteCategory[];
  keyPrefix?: string;
}

// --- Constants ---

export const DEFAULT_CATEGORIES: Record<string, RateLimitCategory> = {
  general: { maxRequests: 100, windowSeconds: 60 },
  auth: { maxRequests: 20, windowSeconds: 60 },
  scanner: { maxRequests: 300, windowSeconds: 60 },
};

export const DEFAULT_ROUTE_CATEGORIES: RouteCategory[] = [
  { prefix: '/auth', category: 'auth' },
  { prefix: '/scanner', category: 'scanner' },
  { prefix: '/checkin', category: 'scanner' },
];

const DEFAULT_KEY_PREFIX = 'rate_limit:';

// --- Helpers ---

export function resolveCategory(url: string, routes: RouteCategory[]): string {
  for (const route of routes) {
    if (url.startsWith(route.prefix)) {
      return route.category;
    }
  }
  return 'general';
}

export function buildRateLimitKey(prefix: string, category: string, identifier: string): string {
  return `${prefix}${category}:${identifier}`;
}

// --- Plugin Implementation ---

/**
 * Rate Limiter Plugin
 *
 * Enforces categorical rate limiting using Redis with atomic pipeline.
 * Supports graceful degradation when Redis is unavailable.
 */
const rateLimiterPlugin: FastifyPluginAsync<RateLimiterPluginOptions> = async (app, opts) => {
  const categories = opts.categories ?? DEFAULT_CATEGORIES;
  const routeCategories = opts.routeCategories ?? DEFAULT_ROUTE_CATEGORIES;
  const keyPrefix = opts.keyPrefix ?? DEFAULT_KEY_PREFIX;

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limiting for health check and OPTIONS preflight
    if (request.url === '/health' || request.method === 'OPTIONS') {
      return;
    }

    const redis = getCacheClient();
    if (!redis) {
      return; // Graceful degradation
    }

    const categoryName = resolveCategory(request.url, routeCategories);
    const config = categories[categoryName] || categories.general;
    const identifier = request.user?.tenant_id || request.ip;
    const key = buildRateLimitKey(keyPrefix, categoryName, identifier);

    try {
      // Use pipeline for atomic INCR + TTL in one round-trip
      const [[err1, count], [err2, ttl]] = (await redis.multi().incr(key).ttl(key).exec()) as Array<
        [Error | null, any]
      >;

      if (err1 || err2 || count === null) {
        throw new Error('Redis rate limit operation failed');
      }

      // Set expiry on first request in window
      if (count === 1) {
        await redis.expire(key, config.windowSeconds);
      }

      const remaining = Math.max(0, config.maxRequests - count);
      reply.header('X-RateLimit-Limit', config.maxRequests.toString());
      reply.header('X-RateLimit-Remaining', remaining.toString());

      if (count > config.maxRequests) {
        const retryAfter = ttl > 0 ? ttl : config.windowSeconds;
        reply.header('Retry-After', retryAfter.toString());

        return reply.status(429).send({
          success: false,
          error: {
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: `Batas permintaan terlampaui untuk kategori ${categoryName}. Maksimal ${config.maxRequests} permintaan per ${config.windowSeconds} detik.`,
          },
          retryAfter,
        });
      }
    } catch (err) {
      request.log.warn({ err }, 'Rate limiter operation failed, allowing request through');
      return; // Graceful degradation
    }
  });
};

export const rateLimiter = fp(rateLimiterPlugin, {
  name: 'rateLimiter',
});
