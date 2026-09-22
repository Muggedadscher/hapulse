#!/usr/bin/env node
/**
 * [fork] Generate the home-screen / favicon set for every selectable app icon
 * (Settings → Symbol): public/icons/<id>.svg + <id>.webmanifest. The glyphs are
 * the same lucide icons PulseLogo draws (read from lucide-react's ESM modules,
 * aliases followed), on the accent square of public/icon.svg.
 *
 * PNG sizes (180 apple-touch, 192, 512 maskable) are rendered from the SVGs by
 * scripts/render-app-icons.sh (needs chromium); all outputs are committed.
 *
 *   node apps/dashboard/scripts/gen-app-icons.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', 'public', 'icons');
const require = createRequire(import.meta.url);
const lucideIcons = join(dirname(require.resolve('lucide-react/package.json')), 'dist', 'esm', 'icons');

const BG = '#e8a84b', FG = '#1c1610';          // = public/icon.svg (aurora accent / on-accent)
const ALTERNATES = ['home', 'sparkles', 'zap', 'star', 'heart', 'flame', 'leaf']; // = PulseLogo.APP_ICON_ALTERNATES

/** lucide iconNode of an icon id, following `export { default } from './x.js'` aliases. */
function iconNode(id) {
  let file = join(lucideIcons, `${id}.js`);
  for (let hop = 0; hop < 5; hop++) {
    const src = readFileSync(file, 'utf8');
    const alias = /export \{ default \} from '\.\/([\w-]+)\.js'/.exec(src);
    if (alias) { file = join(lucideIcons, `${alias[1]}.js`); continue; }
    // lucide-react 0.469: `const X = createLucideIcon("X", [ ...iconNode ]);`
    const m = /createLucideIcon\("[^"]+",\s*(\[[\s\S]*?\])\);/.exec(src);
    if (!m) throw new Error(`no iconNode in ${file}`);
    return new Function(`return ${m[1]}`)();
  }
  throw new Error(`alias loop for ${id}`);
}

function glyphSvg(node) {
  // PulseLogo: glyph = 56 % of the square, stroke 2.25 in 24-unit space
  const size = 512 * 0.56, off = (512 - size) / 2, k = size / 24;
  const els = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([a]) => a !== 'key').map(([a, v]) => `${a}="${v}"`).join(' ')}/>`).join('');
  return `<g transform="translate(${off} ${off}) scale(${k})" fill="none" stroke="${FG}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${els}</g>`;
}

const PULSE = `<polyline points="56,256 136,256 176,140 224,372 256,196 300,312 340,256 456,256" stroke="${FG}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

for (const id of ['pulse', ...ALTERNATES]) {
  const inner = id === 'pulse' ? PULSE : glyphSvg(iconNode(id));
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="128" fill="${BG}"/>${inner}</svg>\n`;
  writeFileSync(join(pub, `${id}.svg`), svg);
  const manifest = {
    name: 'HAPulse', short_name: 'HAPulse', description: 'Your Home Assistant, beautifully simplified.',
    id: '/', start_url: '/', scope: '/', display: 'standalone', background_color: '#161310', theme_color: '#161310',
    icons: [
      { src: `/icons/${id}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/icons/${id}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      { src: `/icons/${id}.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
  writeFileSync(join(pub, `${id}.webmanifest`), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`icons/${id}.svg + .webmanifest${existsSync(join(pub, `${id}-192.png`)) ? '' : '  (PNGs missing → render-app-icons.sh)'}`);
}
