/**
 * [fork] Regenerates CHANGELOG.fork.md from packages/core/src/forkChangelog.ts (the fork's own releases F1, F2, …).
 * Build core first: `npm run build -w @hapulse/core && node packages/core/scripts/gen-fork-changelog.mjs`.
 * apps/dashboard/test/forkChangelog.test.ts fails while the committed file is out of date.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

const { renderForkChangelogMarkdown } = await import(path.join(repoRoot, 'packages/core/dist/forkChangelog.js'));

const out = path.join(repoRoot, 'CHANGELOG.fork.md');
fs.writeFileSync(out, renderForkChangelogMarkdown());
console.log(`Wrote ${path.relative(repoRoot, out)}`);
