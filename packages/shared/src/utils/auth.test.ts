import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyToken } from './auth';
import { ErrorCode } from '../types/errors';
import { UserRole } from '../types/enums';

const SECRET = 'test-secret';

describe('verifyToken', () => {
  it('should successfully verify a valid token', () => {
    const payload = {
      sub: 'user-123',
      tenant_id: 'tenant-456',
      role: UserRole.ADMIN,
      email: 'admin@test.com',
      name: 'Test Admin',
    };
    const token = jwt.sign(payload, SECRET);
    const result = verifyToken(token, { secret: SECRET });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user).toEqual({
        id: payload.sub,
        tenant_id: payload.tenant_id,
        role: payload.role,
        email: payload.email,
        name: payload.name,
      });
      expect(result.payload.sub).toBe(payload.sub);
    }
  });

  it('should fallback to name "User" if name is missing in payload', () => {
    const payload = {
      sub: 'user-123',
      tenant_id: 'tenant-456',
      role: UserRole.CLIENT,
      email: 'client@test.com',
    };
    const token = jwt.sign(payload, SECRET);
    const result = verifyToken(token, { secret: SECRET });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.name).toBe('User');
    }
  });

  it('should return error if sub is missing in token', () => {
    const payload = {
      tenant_id: 'tenant-456',
      role: UserRole.CLIENT,
      email: 'client@test.com',
      name: 'Test Client',
    };
    const token = jwt.sign(payload, SECRET);
    const result = verifyToken(token, { secret: SECRET });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(result.message).toBe('Invalid token payload');
    }
  });

  it('should return error if role is missing in token', () => {
    const payload = {
      sub: 'user-123',
      tenant_id: 'tenant-456',
      email: 'client@test.com',
      name: 'Test Client',
    };
    const token = jwt.sign(payload, SECRET);
    const result = verifyToken(token, { secret: SECRET });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(result.message).toBe('Invalid token payload');
    }
  });

  it('should return error if tenant_id is missing in token', () => {
    const payload = {
      sub: 'user-123',
      role: UserRole.CLIENT,
      email: 'client@test.com',
      name: 'Test Client',
    };
    const token = jwt.sign(payload, SECRET);
    const result = verifyToken(token, { secret: SECRET });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.INVALID_TENANT);
      expect(result.message).toBe('Akses ditolak. Tenant tidak valid.');
    }
  });

  it('should return error if token is expired', () => {
    const payload = {
      sub: 'user-123',
      tenant_id: 'tenant-456',
      role: UserRole.CLIENT,
      email: 'client@test.com',
      name: 'Test Client',
    };
    const token = jwt.sign(payload, SECRET, { expiresIn: '-1s' });
    const result = verifyToken(token, { secret: SECRET });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.TOKEN_EXPIRED);
      expect(result.message).toBe('Access token telah kedaluwarsa.');
    }
  });

  it('should return error if token signature is invalid', () => {
    const payload = {
      sub: 'user-123',
      tenant_id: 'tenant-456',
      role: UserRole.CLIENT,
      email: 'client@test.com',
      name: 'Test Client',
    };
    const token = jwt.sign(payload, SECRET);
    const result = verifyToken(token, { secret: 'different-secret' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.REFRESH_TOKEN_INVALID);
      expect(result.message).toBe('Token tidak valid.');
    }
  });

  it('should return error if token is completely invalid/malformed', () => {
    const result = verifyToken('not-a-token', { secret: SECRET });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.REFRESH_TOKEN_INVALID);
      expect(result.message).toBe('Token tidak valid.');
    }
  });

  it('should return generic error if jwt.verify throws a generic error', () => {
    const originalVerify = jwt.verify;
    // @ts-ignore
    jwt.verify = () => {
      throw new Error('Generic error');
    };
    try {
      const result = verifyToken('some-token', { secret: SECRET });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.INVALID_CREDENTIALS);
        expect(result.message).toBe('Token verification failed');
      }
    } finally {
      jwt.verify = originalVerify;
    }
  });
});
