import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { execSync } from 'child_process'; // [fork]

// [fork] build id for the Sentinel telemetry tag (`hapulse-<sha7>`, NvrCameraPage): HAPULSE_BUILD, else the git commit
// of this checkout (CT 210 and CI build from git), else 'dev' (Docker build without .git)
function forkBuildId(): string {
  if (process.env.HAPULSE_BUILD) return process.env.HAPULSE_BUILD;
  try {
    return execSync('git rev-parse --short=7 HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  define: { __HAPULSE_BUILD__: JSON.stringify(forkBuildId()) }, // [fork]
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
