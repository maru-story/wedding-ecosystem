import jwt from 'jsonwebtoken';
import { ErrorCode } from '../types/errors';
import type { TokenPayload, AuthUser } from '../types/auth';

/**
 * Result of a token verification operation.
 */
export type AuthVerificationResult =
  | { success: true; user: AuthUser; payload: TokenPayload }
  | { success: false; code: ErrorCode; message: string };

/**
 * Common JWT verification options.
 */
export interface VerifyOptions {
  secret: string;
}

/**
 * Standardized JWT token verification utility.
 * Handles common errors (expiry, invalid signature) and returns consistent error codes.
 */
export function verifyToken(token: string, options: VerifyOptions): AuthVerificationResult {
  try {
    const decoded = jwt.verify(token, options.secret) as TokenPayload;

    // Basic payload validation
    if (!decoded.sub || !decoded.role) {
      return {
        success: false,
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid token payload',
      };
    }

    if (!decoded.tenant_id) {
      return {
        success: false,
        code: ErrorCode.INVALID_TENANT,
        message: 'Akses ditolak. Tenant tidak valid.',
      };
    }

    return {
      success: true,
      user: {
        id: decoded.sub,
        tenant_id: decoded.tenant_id,
        role: decoded.role,
        email: decoded.email,
        name: decoded.name || 'User', // Fallback for legacy tokens or missing data
      },
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        code: ErrorCode.TOKEN_EXPIRED,
        message: 'Access token telah kedaluwarsa.',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        code: ErrorCode.REFRESH_TOKEN_INVALID, // Reusing for consistency with existing code
        message: 'Token tidak valid.',
      };
    }

    return {
      success: false,
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Token verification failed',
    };
  }
}
