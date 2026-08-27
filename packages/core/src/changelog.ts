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
    version: '1.3.1',
    date: '2026-08-26',
    title: 'Real covers on the hosted version',
    sections: [
      {
        kind: 'fixed',
        items: [
          'With the direct Music Assistant connection set up, the Now Playing card, the player list and the Zones now show the real album cover \u2014 fetched from the music provider itself \u2014 whenever the Home Assistant one cannot load on the hosted (https) version',
          'Artwork the browser would block anyway (http:// images on an https page) is skipped up front instead of producing a console warning per cover',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-26',
    title: 'Music Assistant, fully at home',
    sections: [
      {
        kind: 'added',
        items: [
          'A music library browser on the Music page when Music Assistant is set up: playlists, albums, artists, tracks and radio, with artwork, favourites, pagination and per-item queueing (play now, play next, add, replace)',
          'Search spans every provider Music Assistant knows \u2014 Spotify included \u2014 and results play directly on any of your speakers',
          'Speaker grouping: link speakers to play together, straight from the queue card \u2014 works for any integration that supports grouping',
          'A play queue card: what\u2019s playing, what\u2019s next, shuffle, repeat, and moving the queue to another speaker mid-play',
          'Connect Music Assistant directly (server URL + API token, one-time) and the queue becomes the full list \u2014 scroll it, drag tracks to reorder, remove them',
        ],
      },
      {
        kind: 'fixed',
        items: [
          'Album covers and artwork that cannot load \u2014 typically http:// images blocked on the hosted (https) version \u2014 now fall back to a tidy placeholder everywhere instead of a broken image',
          'Popovers (like the speaker group menu) no longer render underneath sections further down the page',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-26',
    title: 'Every entity gets a detail view',
    sections: [
      {
        kind: 'added',
        items: [
          'A detail view for every entity, like Home Assistant\u2019s more-info dialog: current state, a history timeline (or a value chart for numeric sensors) switchable between 24 hours and 7 days, and the recent activity list',
          'Sensors open it with a tap; cards with controls (media, climate, covers, locks, vacuums) open it by tapping the card body; lights, switches and buttons open it with a press-and-hold \u2014 mouse and touch alike',
          'Cameras open a live view \u2014 the camera\u2019s stream on top, its activity below \u2014 from any camera tile',
          'Group entities list their members in the detail view, and tapping a member opens its own details',
        ],
      },
      {
        kind: 'fixed',
        items: [
          'A room picture no longer breaks the hero card when the section has a custom height \u2014 the image could render at full size inside a scrolling card, or vanish entirely',
          'The alarm chip in the header now agrees with the Security page when a home has several alarm panels: the armed one wins over a stray disarmed one, and hidden panels are ignored everywhere',
          'The alarm dialog shows every alarm panel, not just the first one Home Assistant happened to list',
        ],
      },
    ],
  },
  {
    version: '1.1.1',
    date: '2026-08-23',
    title: 'Fixes for translated installs, colour lights and deep links',
    sections: [
      {
        kind: 'fixed',
        items: [
          'System Monitor readings — the sidebar health indicator, the CPU/RAM/disk chips and the System page — were blank on every non-English Home Assistant, because the sensors were being matched by their English names',
          'Colour-capable bulbs now have a colour slider. A light reporting both a colour mode and colour temperature previously offered only warmth, with no way to change its colour',
          'Opening Scenes, Security, Energy, Automations or System directly — from a bookmark, a refresh or a shared link — laid the page out without its grid styling',
        ],
      },
    ],
  },
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
