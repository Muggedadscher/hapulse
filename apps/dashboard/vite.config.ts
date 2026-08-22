import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Regex so this only matches the bare specifier, not subpaths like
      // '@hapulse/core/locales/en.json' (those resolve via the package's own
      // `exports` map through node_modules instead).
      { find: /^@hapulse\/core$/, replacement: resolve(__dirname, '../../packages/core/src/index.ts') },
    ],
  },
  server: {
    port: 5173,
  },
});
