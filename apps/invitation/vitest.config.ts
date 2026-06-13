import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    exclude: [...configDefaults.exclude, 'tests/**/*'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@wedding/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
