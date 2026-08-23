/**
 * Release notes — the single source of truth for "what changed", shared by the
 * in-app What's New modal, the Settings → About changelog, and the repository's
 * CHANGELOG.md (generated from this file by `npm run changelog`).
 *
 * WHY DATA AND NOT A MARKDOWN FILE: the app has to answer "which releases has
 * this user not seen yet?", which means comparing versions and rendering only
 * the newer entries. Parsing markdown in the browser to do that would be both
 * heavier and looser than just keeping the notes structured — and a generated
 * CHANGELOG.md cannot drift from what the app shows.
 *
 * WHY ENGLISH ONLY: release notes are the one string set that grows with every
 * release. Making them translatable would block each release on six
 * translations, and a stale translation would show an older release's wording —
 * worse than English. The surrounding UI (titles, buttons, dates) is
 * translated; the notes themselves are not. This is the norm for OSS projects.
 *
 * ADDING A RELEASE: prepend an entry to RELEASES (newest first), bump the
 * `version` field in the package.json files to match, and run
 * `npm run changelog` to regenerate CHANGELOG.md. The core smoke tests assert
 * the ordering, the shape, and that package.json agrees with CURRENT_VERSION.
 */

/** Change categories, in the order they render. Mirrors Keep a Changelog. */
export const CHANGE_KINDS = ['added', 'changed', 'fixed'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export interface ReleaseSection {
  kind: ChangeKind;
  /** One line per change. English, sentence case, no trailing period. */
  items: string[];
}

export interface Release {
  /** Semver `major.minor.patch`. */
  version: string;
  /** Release date, `YYYY-MM-DD`. */
  date: string;
  /** One short line shown as the release's headline. */
  title: string;
  sections: ReleaseSection[];
}

/** Newest first. */
export const RELEASES: Release[] = [
  {
    version: '1.1.0',
    date: '2026-08-23',
    title: 'HAPulse speaks seven languages',
    sections: [
      {
        kind: 'added',
        items: [
          'HAPulse is now available in German, English, Spanish, French, Italian, Portuguese and Swedish',
          'A language picker in Settings → Appearance. Left on “Auto”, HAPulse follows your Home Assistant language, then your browser’s',
          'Entity states (Sunny, Heating, Armed home, …) are translated by Home Assistant itself, so they match the language of the rest of your setup',
          'The sidebar wordmark and logo icon can be renamed and swapped in Settings → Appearance, and the browser tab follows',
          'This changelog — new releases announce themselves once, and the full history lives in Settings → About',
        ],
      },
      {
        kind: 'fixed',
        items: [
          'A brief network drop no longer signs you out of a Home Assistant OAuth session',
          'Dates, times and name sorting now follow the language you are using rather than always English',
          'Scenes now find their room through the device they belong to, so fewer of them land in “Other”',
          'Long lock names and the alarm state label no longer overflow their cards on narrow screens',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-08-16',
    title: 'First public release',
    sections: [
      {
        kind: 'added',
        items: [
          'A themeable Home Assistant dashboard that connects straight from your browser, over your Home Assistant account or a long-lived access token',
          'Home, room, devices, automations, energy, security, music, scenes and system pages',
          'Four colour identities, each in light and dark, with an adjustable accent',
          'Drag-to-reorder editing, hidden entities, favourites and per-room layout, saved to your Home Assistant and synced across your devices',
          'A demo home, so you can try everything before connecting anything',
        ],
      },
    ],
  },
];

/** The version this build reports — always the newest release. */
export const CURRENT_VERSION: string = RELEASES[0]!.version;

/** `[major, minor, patch]`, with non-numeric segments treated as 0. */
function parseVersion(v: string): [number, number, number] {
  const [a, b, c] = v.split('.').map((n) => Number.parseInt(n, 10));
  return [a || 0, b || 0, c || 0];
}

/** Negative when `a` is older than `b`, positive when newer, 0 when equal. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i]! !== pb[i]!) return pa[i]! - pb[i]!;
  }
  return 0;
}

/**
 * Releases newer than `since` — what to show a returning user who last used
 * version `since`. `null` (a fresh install, or a build predating this list)
 * returns nothing: someone opening HAPulse for the first time should not be
 * greeted by a changelog.
 */
export function releasesSince(since: string | null): Release[] {
  if (since === null) return [];
  return RELEASES.filter((r) => compareVersions(r.version, since) > 0);
}
