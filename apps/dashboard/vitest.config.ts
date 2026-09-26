import { defineConfig } from 'vitest/config';

// [fork] Unit tests for pure dashboard logic (node environment, no DOM).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
