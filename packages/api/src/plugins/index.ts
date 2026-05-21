export {
  rateLimiter,
  resolveCategory,
  buildRateLimitKey,
  DEFAULT_CATEGORIES,
  DEFAULT_ROUTE_CATEGORIES,
} from './rate-limiter/rate-limiter';
export type { RateLimitCategory, RateLimiterPluginOptions, RouteCategory } from './rate-limiter/rate-limiter';

export {
  auditLogger,
  buildAuditEntry,
  matchAutoLogRoute,
  DEFAULT_AUTO_LOG_ROUTES,
} from './audit-logger/audit-logger';
export type { AuditAction, AuditEntry, AuditLoggerOptions, AutoLogRoute } from './audit-logger/audit-logger';

export { cors, buildAllowedOriginPatterns, isOriginAllowed, CORS_CONSTANTS } from './cors/cors';
export type { CorsPluginOptions } from './cors/cors';

export {
  responseCache,
  patternToRegex,
  matchesPattern,
  findCacheRoute,
  shouldInvalidate,
  buildCacheKey,
  DEFAULT_CACHE_ROUTES,
  DEFAULT_INVALIDATION_RULES,
  RESPONSE_CACHE_CONSTANTS,
} from './response-cache/response-cache';
export type {
  CacheRoute,
  InvalidationRule,
  ResponseCacheOptions,
  CachedResponse,
} from './response-cache/response-cache';

export { auth } from './auth';
export type { AuthPluginOptions } from './auth';

export { requestLogger } from './request-logger';

export { securityHeaders } from './security-headers/security-headers';
