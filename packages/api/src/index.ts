import Fastify from 'fastify';
import { createProductionPrismaClient } from '@wedding/db';
import {
  createRealtimeServer,
  createAuthMiddleware as createWsAuthMiddleware,
  registerRoomAuthorization,
  type RealtimeServer,
  type EventAuthRepository,
} from '@wedding/realtime';
import { authRoutes } from './routes/auth';
import { guestRoutes } from './routes/guests/guests';
import { eventRoutes } from './routes/events';
import { invitationDeliveryRoutes } from './routes/invitation-deliveries';
import { invitationRoutes } from './routes/invitations';
import { checkinRoutes } from './routes/checkin';
import { rsvpRoutes } from './routes/rsvp';
import { cmsRoutes } from './routes/cms';
import { scannerRoutes } from './routes/scanner';
import { messageRoutes } from './routes/messages';
import { healthRoutes } from './routes/health/health';
import { adminRoutes } from './routes/admin';
import { createCORSMiddleware, createDefaultCORSConfig } from './middleware';
import {
  auditLogger,
  responseCache,
  auth,
  requestLogger,
  rateLimiter,
  securityHeaders,
  DEFAULT_CACHE_ROUTES,
  DEFAULT_INVALIDATION_RULES,
} from './plugins';
import { getFastifyLoggerConfig } from './config/logger/logger';
import { getFastifyProductionOptions, getProductionConfig } from './config/production';
import { getCacheClient, disconnectRedis } from './config/redis/redis';
import { validateEnv, loadEncryptionKey } from './config';
import multipart from '@fastify/multipart';

// --- Config ---
const env = validateEnv();
loadEncryptionKey(); // Validates AES-256 encryption key configuration (throws if missing/invalid)
const JWT_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.REFRESH_SECRET;

const productionConfig = getProductionConfig();
const PORT = productionConfig.server.port;

// CORS origins
const DASHBOARD_ORIGIN = env.DASHBOARD_ORIGIN || 'http://localhost:3000';
const INVITATION_ORIGIN = env.INVITATION_ORIGIN || 'http://localhost:3001';
const SCANNER_ORIGIN = env.SCANNER_ORIGIN || 'http://localhost:3002';

// --- Prisma Client (production-ready) ---
const prisma = createProductionPrismaClient();

// --- Fastify Server ---
const app = Fastify({
  logger: getFastifyLoggerConfig(),
  ...getFastifyProductionOptions(productionConfig),
});

// --- Register Plugins ---

// Security & Infrastructure
app.register(securityHeaders);
app.register(requestLogger);
app.register(auditLogger, { prisma });
app.register(responseCache, {
  cacheRoutes: DEFAULT_CACHE_ROUTES,
  invalidationRules: DEFAULT_INVALIDATION_RULES,
});

// Auth & Rate Limiting
app.register(auth, { jwtSecret: JWT_SECRET });
app.register(rateLimiter);
app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
});

// --- CORS Middleware (Req 13.7) ---
const corsConfig = createDefaultCORSConfig({
  origins: {
    dashboard: [DASHBOARD_ORIGIN],
    invitation: [INVITATION_ORIGIN],
    scanner: [SCANNER_ORIGIN],
  },
});
app.addHook('onRequest', createCORSMiddleware(corsConfig));

// --- WebSocket / Realtime Server ---
let realtime: RealtimeServer | null = null;

// --- Routes ---

// Public routes
app.register(authRoutes, {
  prefix: '/auth',
  prisma,
  jwtSecret: JWT_SECRET,
  refreshSecret: REFRESH_SECRET,
});
app.register(invitationRoutes, { prefix: '/invitations', prisma });
app.register(messageRoutes, { prefix: '/messages', prisma });
app.register(healthRoutes, { prisma, getRealtimeServer: () => realtime });

// Protected routes
app.register(guestRoutes, { prefix: '/guests', prisma });
app.register(eventRoutes, { prefix: '/events', prisma });
app.register(invitationDeliveryRoutes, { prefix: '/invitation-deliveries', prisma });
app.register(cmsRoutes, { prefix: '/cms', prisma });
app.register(scannerRoutes, { prefix: '/scanner', prisma });
app.register(adminRoutes, { prefix: '/admin', prisma });

// Realtime-enabled
app.register(async (instance) => {
  instance.register(checkinRoutes, {
    prefix: '/checkin',
    prisma,
    getRealtimeServer: () => realtime,
  });
}, {});

app.register(async (instance) => {
  instance.register(rsvpRoutes, {
    prefix: '/rsvp',
    prisma,
    getRealtimeServer: () => realtime,
  });
}, {});

// --- WebSocket Authorization Helper ---
const eventAuthRepository: EventAuthRepository = {
  async isEventOwnedByTenant(eventId: string, tenantId: string): Promise<boolean> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenant_id: tenantId },
      select: { id: true },
    });
    return event !== null;
  },
};

// --- Lifecycle ---

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const redis = getCacheClient();
    if (redis) {
      await redis.connect().catch((err: Error) => {
        console.warn('⚠️  Redis connection failed (graceful degradation):', err.message);
      });
    }

    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 API server running on http://localhost:${PORT} in ${env.NODE_ENV} mode`);

    // WebSocket Setup
    realtime = createRealtimeServer({
      httpServer: app.server,
      cors: {
        origin: [DASHBOARD_ORIGIN, INVITATION_ORIGIN, SCANNER_ORIGIN],
        credentials: true,
      },
    });

    realtime.io.use(
      createWsAuthMiddleware({
        jwtSecret: JWT_SECRET,
        eventAuthRepository,
      })
    );

    realtime.io.on('connection', (socket) => {
      registerRoomAuthorization(socket, eventAuthRepository);
    });

    console.log('🔌 WebSocket server attached');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// --- Graceful Shutdown ---
async function shutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  const timer = setTimeout(() => {
    console.error('[Shutdown] Timeout reached, forcing exit.');
    process.exit(1);
  }, productionConfig.process.gracefulShutdownTimeout);

  try {
    await app.close();
    if (realtime) {
      realtime.io.emit('server_shutting_down', {
        reason: 'Server is shutting down',
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await realtime.close();
    }
    await disconnectRedis();
    await prisma.$disconnect();

    clearTimeout(timer);
    console.log('[Shutdown] Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('[Shutdown] Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

export { app, prisma, realtime, JWT_SECRET, REFRESH_SECRET };
