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
 * Based on the RBAC matrix from the design document:
 *
 * | Role             | Dashboard      | CMS            | Scanner                          | Guest Data       |
 * |------------------|----------------|----------------|----------------------------------|------------------|
 * | Admin            | Scoped Access  | Scoped Access  | Scoped Access                    | Scoped per assign|
 * | Client           | Own Event      | Own Event      | View Only                        | Own Event        |
 * | WO               | Assigned Events| Assigned Events| Full Access                      | Assigned Events  |
 * | Scanner Operator | -              | -              | QR Scan + Manual Check-in (both) | Read Only        |
 */
export const PERMISSIONS = {
  /** All authenticated roles can access */
  ALL_ROLES: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT, UserRole.WO, UserRole.SCANNER],
  },

  /** Admin, Client, and WO can manage dashboard resources */
  DASHBOARD_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT, UserRole.WO],
  },

  /** Admin, Client, and WO can manage CMS */
  CMS_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT, UserRole.WO],
  },

  /** Admin, WO, and Scanner Operator can use scanner */
  SCANNER_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.WO, UserRole.SCANNER],
  },

  /** Only Admin and Client can manage events */
  EVENT_MANAGEMENT: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT],
  },

  /** Admin, Client, and WO can manage guests */
  GUEST_MANAGEMENT: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT, UserRole.WO],
  },

  /** All roles can read guest data (Scanner has read-only) */
  GUEST_READ: {
    allowedRoles: [UserRole.ADMIN, UserRole.CLIENT, UserRole.WO, UserRole.SCANNER],
  },

  /** Scanner Operator can perform check-in operations (QR scan + manual) */
  CHECKIN_ACCESS: {
    allowedRoles: [UserRole.ADMIN, UserRole.WO, UserRole.SCANNER],
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
      // Return 403 without revealing resource existence (Req 1.3, 2.6, 2.7, 2.8)
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
