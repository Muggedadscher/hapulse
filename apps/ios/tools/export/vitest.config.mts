import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// [fork] iOS app: generator for the files the Swift code reads (texts, colours, icons, demo data, golden test cases).
// Run from the repo root: npx vitest run --config apps/ios/tools/export/vitest.config.mts
// It is a vitest "test" only so that the TypeScript sources of core and dashboard load without a build and the clock can
// be fixed; it is not part of `npm test`, so a change in the web code never turns the web CI red.
export default defineConfig({
  root: fileURLToPath(new URL('../../../..', import.meta.url)),
  test: {
    include: ['apps/ios/tools/export/export.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
  },
});
