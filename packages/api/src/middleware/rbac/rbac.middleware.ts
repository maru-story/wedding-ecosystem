import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCode, UserRole } from '@wedding/shared';

// --- Types ---

/** Permission definition for a route or resource */
export interface Permission {
  /** Roles allowed to access this resource */
  allowedRoles: UserRole[];
}

/** Role-based access configuration for different resource types */
export interface RBACConfig {
  /** Roles that can access the resource */
  allowedRoles: UserRole[];
}

// --- Predefined Permission Sets ---

/**
 * Predefined permission sets for common access patterns.
 * Simplified for 2-role system (Admin and Client) as per MVP strategy.
 * Roles WO and SCANNER are kept in enum but temporarily removed from access sets.
 *
 * | Role             | Dashboard      | CMS            | Scanner                          | Guest Data       |
 * |------------------|----------------|----------------|----------------------------------|------------------|
 * | Admin            | Full Access    | Full Access    | Full Access                      | Full Access      |
 * | Client           | Own Event      | Own Event      | Full Access (Own Event)          | Own Event        |
 */
export const PERMISSIONS = {
  /** All authenticated roles can access */
  ALL_ROLES: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT, UserRole.WO, UserRole.SCANNER],
  },

  /** Admin and Client can manage dashboard resources */
  DASHBOARD_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** Admin and Client can manage CMS */
  CMS_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** Admin and Client can use scanner (Client uses for their own event) */
  SCANNER_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** Only Admin and Client can manage events */
  EVENT_MANAGEMENT: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** Admin and Client can manage guests */
  GUEST_MANAGEMENT: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** All primary roles can read guest data */
  GUEST_READ: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** Admin and Client can perform check-in operations */
  CHECKIN_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** Only Admin can perform system-level operations */
  ADMIN_ONLY: {
    allowedRoles: [UserRole.ADMIN],
  },
} as const satisfies Record<string, RBACConfig>;

// --- Middleware Factory ---

export function createRBACMiddleware(config: RBACConfig) {
  return async function rbacHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;

    // Ensure user context exists (middleware ordering check)
    if (!user) {
      reply.status(403).send({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Akses ditolak.',
        },
      });
      return;
    }

    const userRole = user.role as UserRole;

    // Check if user's role is in the allowed roles list
    if (!config.allowedRoles.includes(userRole)) {
      // Return 403 without revealing resource existence
      reply.status(403).send({
        success: false,
        error: {
          code: ErrorCode.ROLE_INSUFFICIENT,
          message: 'Akses ditolak.',
        },
      });
      return;
    }
  };
}

/** Check if the authenticated user has a specific role */
export function hasRole(request: FastifyRequest, role: UserRole): boolean {
  return request.user?.role === role;
}

/** Check if the authenticated user has any of the specified roles */
export function hasAnyRole(request: FastifyRequest, roles: UserRole[]): boolean {
  const userRole = request.user?.role;
  return userRole ? roles.includes(userRole as UserRole) : false;
}

/** Get the role of the authenticated user, or null if unauthenticated */
export function getUserRole(request: FastifyRequest): UserRole | null {
  return (request.user?.role as UserRole) || null;
}
