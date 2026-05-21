/**
 * Database configuration for the API package.
 *
 * Consolidated logic moved to @wedding/db to maintain a single source of truth
 * for pooling formulas, SSL validation, and environment resolution.
 */

export {
  calculatePoolSize,
  getDatabaseUrls,
  getSSLConfig,
  getDatabaseConfig,
  getPoolConfig,
} from '@wedding/db';

export type {
  DatabaseUrls,
  SSLConfig,
  DatabaseConfig,
  PoolConfig,
} from '@wedding/db';

import { getDatabaseConfig } from '@wedding/db';
export default getDatabaseConfig;
