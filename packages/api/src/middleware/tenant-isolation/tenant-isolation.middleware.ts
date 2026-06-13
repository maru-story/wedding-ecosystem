import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCode, verifyToken } from '@wedding/shared';
import type { AuthUser } from '@wedding/shared';

// --- Types ---

/** Authenticated request context attached by tenant isolation middleware */
export type TenantContext = AuthUser;

/** Extended Fastify request with tenant context (via request.user) */
export type AuthenticatedRequest = FastifyRequest & {
  user: TenantContext;
};

// Ensure FastifyRequest has user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: TenantContext;
  }
}

// --- Middleware Factory ---

/**
 * Creates a Fastify onRequest hook that:
 * 1. Extracts and verifies the JWT access token from the Authorization header
 * 2. Extracts tenant_id from the token payload
 * 3. Rejects requests without a valid tenant_id (Req 1.5)
 * 4. Attaches tenant context to request.user for downstream use (Req 1.2)
 *
 * This is the SINGLE auth seam for the entire API.
 * All protected routes use this middleware — no other auth implementation exists.
 */
export function createAuthMiddleware(jwtSecret: string) {
  return async function authHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Extract Bearer token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_2002',
          message: 'Token autentikasi diperlukan.',
        },
      });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    const result = verifyToken(token, { secret: jwtSecret });

    if (!result.success) {
      if (result.code === ErrorCode.INVALID_TENANT) {
        reply.status(403).send({
          success: false,
          error: {
            code: result.code,
            message: result.message,
          },
        });
        return;
      }

      const isExpired = result.code === ErrorCode.TOKEN_EXPIRED;
      reply.status(401).send({
        success: false,
        error: {
          code: isExpired ? 'AUTH_2002' : 'AUTH_2003',
          message: result.message,
        },
      });
      return;
    }

    // Attach tenant context to request.user
    request.user = result.user;
  };
}

/**
 * Legacy alias — kept for backward compatibility with existing middleware exports.
 * Delegates to createAuthMiddleware internally.
 */
export function createTenantIsolationMiddleware(config: { jwtSecret: string }) {
  return createAuthMiddleware(config.jwtSecret);
}

// --- Query Filter Helper ---

/**
 * Creates a tenant-scoped filter object for database queries.
 * Ensures all queries are automatically filtered by tenant_id (Req 1.2).
 * Admin role bypasses the tenant filter to query globally.
 */
export function tenantFilter(request: FastifyRequest): { tenant_id?: string } {
  const user = request.user;
  if (!user) {
    throw new Error('Tenant context not available. Ensure auth middleware is applied.');
  }
  if (user.role === 'admin') {
    return {};
  }
  if (!user.tenant_id) {
    throw new Error('Tenant ID not available in user context.');
  }
  return { tenant_id: user.tenant_id };
}

/**
 * Validates that a resource belongs to the requesting tenant.
 * Returns false if the resource's tenant_id doesn't match the request's tenant_id.
 * Used to enforce cross-tenant access rejection (Req 1.3).
 * Admin role bypasses this validation.
 *
 * IMPORTANT: When this returns false, respond with 403 Forbidden
 * without revealing whether the resource exists.
 */
export function validateTenantOwnership(
  request: FastifyRequest,
  resourceTenantId: string
): boolean {
  const user = request.user;
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return user.tenant_id === resourceTenantId;
}
