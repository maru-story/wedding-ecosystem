import { UserRole } from './enums';

/**
 * JWT access token payload structure.
 * Standardized across REST API and WebSockets.
 */
export interface TokenPayload {
  /** User ID (mapped to 'sub' in JWT) */
  sub: string;
  /** Tenant ID for multi-tenant isolation */
  tenant_id: string;
  /** User role for RBAC */
  role: UserRole;
  /** User email */
  email: string;
  /** User display name */
  name: string;
  /** Issued at (standard JWT claim) */
  iat?: number;
  /** Expiration time (standard JWT claim) */
  exp?: number;
}

/**
 * Standardized authentication tokens.
 */
export interface AuthTokens {
  /** JWT access token (short-lived) */
  access_token: string;
  /** JWT refresh token (long-lived) */
  refresh_token: string;
  /** Expiration time of access token in seconds */
  expires_in: number;
}

/**
 * Authenticated user context attached to requests/sockets.
 */
export interface AuthUser {
  id: string;
  tenant_id: string;
  role: UserRole;
  email: string;
  name: string;
}

/**
 * Refresh token payload structure.
 */
export interface RefreshTokenPayload {
  /** User ID */
  sub: string;
  /** Unique ID for token rotation/revocation */
  jti: string;
}
