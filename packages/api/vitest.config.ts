import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    exclude: [...configDefaults.exclude, 'tests/e2e/**/*'],
  },
});
