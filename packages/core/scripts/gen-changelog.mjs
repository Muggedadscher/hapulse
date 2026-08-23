/**
 * Regenerates CHANGELOG.md from packages/core/src/changelog.ts.
 *
 * The release notes live as structured data because the app needs to render
 * "what's new since your last version"; this script keeps the repository's
 * human-readable changelog in step with it. Run `npm run changelog` after
 * adding a release — never hand-edit CHANGELOG.md, it is overwritten.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

const { RELEASES, CHANGE_KINDS } = await import(
  path.join(repoRoot, 'packages/core/dist/changelog.js')
);

const HEADING = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
};

const lines = [
  '# Changelog',
  '',
  'All notable changes to HAPulse are recorded here.',
  '',
  '<!-- Generated from packages/core/src/changelog.ts by `npm run changelog`.',
  '     Edit that file, not this one — this file is overwritten. -->',
  '',
];

for (const release of RELEASES) {
  lines.push(`## ${release.version} — ${release.date}`, '', `_${release.title}_`, '');
  // Iterate CHANGE_KINDS rather than release.sections so every release renders
  // its categories in the same order regardless of how they were authored.
  for (const kind of CHANGE_KINDS) {
    const section = release.sections.find((s) => s.kind === kind);
    if (!section || section.items.length === 0) continue;
    lines.push(`### ${HEADING[kind]}`, '');
    for (const item of section.items) lines.push(`- ${item}`);
    lines.push('');
  }
}

const out = lines.join('\n').replace(/\n{3,}/g, '\n\n');
fs.writeFileSync(path.join(repoRoot, 'CHANGELOG.md'), out);
console.log(`CHANGELOG.md written — ${RELEASES.length} releases, newest ${RELEASES[0].version}`);
