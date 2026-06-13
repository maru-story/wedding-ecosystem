import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    exclude: ['**/dist/**', 'node_modules/**'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});
