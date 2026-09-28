/**
 * [fork] One release list for the changelog UI: upstream's releases (changelog.ts, English) and this fork's own
 * (forkChangelog.ts, German/English), newest first. Pure — tested in test/forkChangelog.test.ts.
 */

import { forkLabel, pickText } from '@hapulse/core';
import type { ForkRelease, Release } from '@hapulse/core';

export interface ChangelogEntry {
  key: string;
  isFork: boolean;
  /** Fork releases in the upstream shape: version "F11", texts in the UI language. */
  release: Release;
}

/** What's New shows the newest release in full and only the titles of older ones beyond this many. */
export const WHATS_NEW_FULL_LIMIT = 2;

export function localizeForkRelease(r: ForkRelease, locale: string): Release {
  return {
    version: forkLabel(r.version),
    date: r.date,
    title: pickText(r.title, locale),
    sections: r.sections.map((s) => ({ kind: s.kind, items: s.items.map((i) => pickText(i, locale)) })),
  };
}

/** Both lists merged by date (newest first); on the same day the fork's release comes first. */
export function changelogEntries(upstream: readonly Release[], fork: readonly ForkRelease[], locale: string): ChangelogEntry[] {
  const all: ChangelogEntry[] = [
    ...fork.map((r) => ({ key: `fork-${r.version}`, isFork: true, release: localizeForkRelease(r, locale) })),
    ...upstream.map((r) => ({ key: `up-${r.version}`, isFork: false, release: r })),
  ];
  return all
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.release.date.localeCompare(a.entry.release.date) || a.index - b.index)
    .map(({ entry }) => entry);
}

/** What's New: everything in full up to the limit; beyond it the newest in full, the rest as a title list. */
export function splitWhatsNew(entries: ChangelogEntry[]): { full: ChangelogEntry[]; compact: ChangelogEntry[] } {
  if (entries.length <= WHATS_NEW_FULL_LIMIT) return { full: entries, compact: [] };
  return { full: entries.slice(0, 1), compact: entries.slice(1) };
}
