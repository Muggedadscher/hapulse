# Contributing to HAPulse

## Dev setup

Requirements: Node >= 20, npm >= 10.

```bash
git clone https://github.com/jlnbln/HAPulse.git
cd HAPulse
npm install
```

## npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dashboard dev server at localhost:5173 |
| `npm run build` | Build `@hapulse/core` then `@hapulse/dashboard` (outputs to `apps/dashboard/dist`) |
| `npm run typecheck` | Type-check both packages |
| `npm test -w @hapulse/core` | Run core smoke tests |

## Code style

- **TypeScript strict** throughout. Avoid `any`; where HA payloads are untyped, add a local type rather than casting.
- **Design tokens** — all colors, spacing, and typography come from CSS custom properties defined in `docs/DESIGN.md`. Do not introduce hardcoded hex values.
- **`@hapulse/core` stays React-free** — no DOM, no JSX. This package is reused by the future mobile app. All HA logic (connection, registries, rooms, demo data) lives here; components are thin consumers.
- **Zustand selectors** — never subscribe a component to the whole entity map. Use `useEntity(id)` / `useEntities(ids)` or a scoped selector.
- **Responsive** — every page must work at 375px and 1440px.
- **Graceful degradation** — missing domains (no cameras, no weather entity) must hide the section, not crash.

## Pull requests

- One concern per PR where possible.
- Include a short description of the change and any manual testing you did.
- For visual changes, a screenshot or short screen recording is appreciated.
- The CI workflow runs `npm run typecheck`, `npm run build`, and `npm test -w @hapulse/core` on every PR.

## How contributions land

This repository is the open-source distribution of HAPulse. Its `packages/core`
and `apps/dashboard` are developed in a larger private monorepo — which also
holds the hosted service and the mobile apps — and exported here by a publish
script. That is what the periodic *"Sync from monorepo"* commits are.

**This does not change how you contribute.** Pull requests are reviewed and
merged here, so your commits and your authorship stay in this repository's
history. Two things are worth knowing:

- A later sync commit may touch files you changed. That is the export running,
  not your work being reverted.
- Translation dictionaries live in `packages/core/locales/`, not in the
  dashboard, so every HAPulse app can share them.

### Adding or improving a language

`packages/core/locales/en.json` is the source of truth. A translation is one
flat JSON file next to it, named for its locale, with **exactly** the same keys.

1. Copy `en.json` to `<locale>.json` and translate the values. Keep every
   `{placeholder}` — the tests fail if one is dropped or renamed.
2. Register the locale in `packages/core/src/i18n.ts` (`LOCALES` and
   `LOCALE_LABELS`, the latter in the language's own name) and in `DICTS` in
   `apps/dashboard/src/i18n/I18nProvider.tsx`.
3. Run `npm test -w @hapulse/core`. It checks key parity, placeholder
   preservation and plural pairing for every registered locale, so a dictionary
   that drifts from `en.json` cannot land.

Keys ending `.one` / `.other` are plural forms selected by `Intl.PluralRules`;
translate both even when your language uses the same wording for each. Entity
states (Sunny, Heating, Armed home, …) are **not** in these files — they come
from Home Assistant's own translations, so they follow your HA language.

### Release notes

`CHANGELOG.md` is generated — do not edit it by hand. Release notes live in
`packages/core/src/changelog.ts`, which also feeds the in-app What's New modal
and the version shown in Settings → About. Add an entry there, bump the
`version` in the `package.json` files to match, and run `npm run changelog`.
Notes are written in English and are not translated.

### Maintainers: the dual-apply rule

The export **deletes and re-copies** `packages/core` and `apps/dashboard` from
the monorepo. Merging a pull request here is therefore only half the job:
anything merged here and not mirrored upstream is **silently reverted by the
next sync**.

For every pull request merged here:

1. **Merge it here.** Contributor commits and authorship stay in the public history.
2. **Port the same change upstream** into the monorepo's copy of the affected paths.
   Since PRs branch from this repository — whose content matches the monorepo for
   those paths — this is normally a clean patch apply.
3. **Verify upstream:** `npm run typecheck`, `npm run build` and
   `npm test -w @hapulse/core`, plus the monorepo's other apps, which the CI here
   does not cover.
4. **Re-export and check the diff is empty** for the files you just ported. A
   non-empty diff means the port missed something and the next sync would undo it.

Do steps 1–4 in one sitting. A merged pull request that is left un-ported looks
fine until the next unrelated sync quietly removes it.
