import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@wedding/db';
import type Redis from 'ioredis';
import { getCacheClient, getPubSubClient } from '../../config/redis/redis';
import type { RealtimeServer } from '@wedding/realtime';

/**
 * Health check endpoint for production monitoring.
 * Checks connectivity and latency for core dependencies.
 */

// --- Types ---

interface DependencyStatus {
  status: 'up' | 'down';
  latency: number;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: {
    postgresql: DependencyStatus;
    redis_cache: DependencyStatus;
    redis_pubsub: DependencyStatus;
    websocket: DependencyStatus;
  };
}

interface HealthRouteOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
  getRealtimeServer: () => RealtimeServer | null;
}

// --- Constants ---

const APP_VERSION = process.env.APP_VERSION || '0.1.0';
const HEALTH_CHECK_TIMEOUT_MS = 4500;
const START_TIME = Date.now();

// --- Dependency Check Helpers ---

async function checkPostgresql(prisma: PrismaClient): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return { status: 'up', latency: Date.now() - start };
  } catch {
    return { status: 'down', latency: Date.now() - start };
  }
}

async function checkRedis(getClient: () => Redis | null): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    const client = getClient();
    if (!client) return { status: 'down', latency: 0 };
    await client.ping();
    return { status: 'up', latency: Date.now() - start };
  } catch {
    return { status: 'down', latency: Date.now() - start };
  }
}

function checkWebSocket(getRealtimeServer: () => RealtimeServer | null): DependencyStatus {
  const start = Date.now();
  try {
    const realtime = getRealtimeServer();
    if (!realtime || !realtime.io) return { status: 'down', latency: 0 };
    return { status: 'up', latency: Date.now() - start };
  } catch {
    return { status: 'down', latency: Date.now() - start };
  }
}

function determineOverallStatus(
  dependencies: HealthCheckResponse['dependencies']
): HealthCheckResponse['status'] {
  const criticalDown =
    dependencies.postgresql.status === 'down' || dependencies.websocket.status === 'down';
  const nonCriticalDown =
    dependencies.redis_cache.status === 'down' || dependencies.redis_pubsub.status === 'down';

  if (criticalDown) return 'unhealthy';
  if (nonCriticalDown) return 'degraded';
  return 'healthy';
}

// --- Route Plugin ---

export async function healthRoutes(app: FastifyInstance, opts: HealthRouteOptions) {
  const { prisma, getRealtimeServer } = opts;

  app.get('/health', async (_request, reply) => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT_MS)
    );

    try {
      const [postgresql, redisCache, redisPubSub] = await Promise.race([
        Promise.all([
          checkPostgresql(prisma),
          checkRedis(getCacheClient),
          checkRedis(getPubSubClient),
        ]),
        timeoutPromise,
      ]);

      const websocket = checkWebSocket(getRealtimeServer);

      const dependencies: HealthCheckResponse['dependencies'] = {
        postgresql,
        redis_cache: redisCache,
        redis_pubsub: redisPubSub,
        websocket,
      };

      const status = determineOverallStatus(dependencies);
      const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

      const response: HealthCheckResponse = {
        status,
        timestamp: new Date().toISOString(),
        version: APP_VERSION,
        uptime: uptimeSeconds,
        dependencies,
      };

      return reply.status(status !== 'unhealthy' ? 200 : 503).send(response);
    } catch {
      const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
      const errorStatus: DependencyStatus = { status: 'down', latency: HEALTH_CHECK_TIMEOUT_MS };

      const response: HealthCheckResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: APP_VERSION,
        uptime: uptimeSeconds,
        dependencies: {
          postgresql: errorStatus,
          redis_cache: errorStatus,
          redis_pubsub: errorStatus,
          websocket: errorStatus,
        },
      };

      return reply.status(503).send(response);
    }
  });
}
