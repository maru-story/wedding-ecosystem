import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculatePoolSize,
  getPoolOptions,
  getSSLConfig,
  getDatabaseUrls,
  getPoolConfig,
  getDatabaseConfig,
} from './client';

describe('Database Client Configuration', () => {
  describe('calculatePoolSize', () => {
    it('should apply formula: (CPU cores × 2) + 1', () => {
      expect(calculatePoolSize(5)).toBe(11); // (5 × 2) + 1 = 11
      expect(calculatePoolSize(8)).toBe(17); // (8 × 2) + 1 = 17
      expect(calculatePoolSize(16)).toBe(33); // (16 × 2) + 1 = 33
    });

    it('should enforce minimum of 10 connections', () => {
      expect(calculatePoolSize(1)).toBe(10); // (1 × 2) + 1 = 3, min 10
      expect(calculatePoolSize(2)).toBe(10); // (2 × 2) + 1 = 5, min 10
      expect(calculatePoolSize(3)).toBe(10); // (3 × 2) + 1 = 7, min 10
      expect(calculatePoolSize(4)).toBe(10); // (4 × 2) + 1 = 9, min 10
    });

    it('should return values above 10 when cores are sufficient', () => {
      expect(calculatePoolSize(5)).toBe(11);
      expect(calculatePoolSize(6)).toBe(13);
      expect(calculatePoolSize(10)).toBe(21);
    });

    it('should use system CPU count when no argument provided', () => {
      const result = calculatePoolSize();
      expect(result).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getSSLConfig', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return verify-full mode in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getSSLConfig();
      expect(config.mode).toBe('verify-full');
      expect(config.rejectUnauthorized).toBe(true);
    });

    it('should return prefer mode in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getSSLConfig();
      expect(config.mode).toBe('prefer');
      expect(config.rejectUnauthorized).toBe(false);
    });
  });

  describe('getDatabaseUrls', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      delete process.env.DATABASE_URL;
      delete process.env.DATABASE_POOLED_URL;
    });

    afterEach(() => {
      process.env.DATABASE_URL = originalEnv.DATABASE_URL;
      process.env.DATABASE_POOLED_URL = originalEnv.DATABASE_POOLED_URL;
    });

    it('should throw if DATABASE_URL is not set', () => {
      expect(() => getDatabaseUrls()).toThrow('DATABASE_URL');
    });

    it('should return both URLs when both are set', () => {
      process.env.DATABASE_URL = 'postgresql://host:5432/db';
      process.env.DATABASE_POOLED_URL = 'postgresql://host:6543/db';

      const urls = getDatabaseUrls();
      expect(urls.directUrl).toBe('postgresql://host:5432/db');
      expect(urls.pooledUrl).toBe('postgresql://host:6543/db');
    });

    it('should fall back to DATABASE_URL for pooled when DATABASE_POOLED_URL is not set', () => {
      process.env.DATABASE_URL = 'postgresql://host:5432/db';

      const urls = getDatabaseUrls();
      expect(urls.directUrl).toBe('postgresql://host:5432/db');
      expect(urls.pooledUrl).toBe('postgresql://host:5432/db');
    });
  });

  describe('getPoolOptions', () => {
    it('should return pool size >= 10', () => {
      const options = getPoolOptions();
      expect(options.max).toBeGreaterThanOrEqual(10);
    });

    it('should set statement timeout to 30 seconds (30000ms)', () => {
      const options = getPoolOptions();
      expect(options.statementTimeout).toBe(30_000);
    });

    it('should set idle timeout to 60 seconds', () => {
      const options = getPoolOptions();
      expect(options.idleTimeoutMillis).toBe(60_000);
    });

    it('should set connection timeout to 10 seconds', () => {
      const options = getPoolOptions();
      expect(options.connectionTimeoutMillis).toBe(10_000);
    });

    it('should have min connections <= max connections', () => {
      const options = getPoolOptions();
      expect(options.min).toBeLessThanOrEqual(options.max);
      expect(options.min).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getPoolConfig', () => {
    it('should return pool size >= 10', () => {
      const config = getPoolConfig();
      expect(config.max).toBeGreaterThanOrEqual(10);
    });

    it('should set statement timeout to 30 seconds', () => {
      const config = getPoolConfig();
      expect(config.statementTimeout).toBe(30_000);
    });
  });

  describe('getDatabaseConfig', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://host:5432/db';
      process.env.DATABASE_POOLED_URL = 'postgresql://host:6543/db';
    });

    afterEach(() => {
      process.env.DATABASE_URL = originalEnv.DATABASE_URL;
      process.env.DATABASE_POOLED_URL = originalEnv.DATABASE_POOLED_URL;
    });

    it('should return complete configuration object', () => {
      const config = getDatabaseConfig();

      expect(config.poolSize).toBeGreaterThanOrEqual(10);
      expect(config.queryTimeout).toBe(30_000);
      expect(config.idleTimeout).toBe(60_000);
      expect(config.connectionTimeout).toBe(10_000);
      expect(config.ssl).toBeDefined();
      expect(config.urls.directUrl).toBe('postgresql://host:5432/db');
      expect(config.urls.pooledUrl).toBe('postgresql://host:6543/db');
    });
  });
});
