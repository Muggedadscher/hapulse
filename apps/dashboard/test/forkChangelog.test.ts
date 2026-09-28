// [fork] The fork's own release notes (forkChangelog.ts) and how they merge with upstream's in the changelog UI.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CURRENT_FORK_VERSION, CURRENT_VERSION, FORK_RELEASES, RELEASES, forkReleasesSince, pickText, renderForkChangelogMarkdown,
} from '@hapulse/core';
import type { Release } from '@hapulse/core';
import { changelogEntries, splitWhatsNew } from '../src/components/changelog/forkEntries';
import { useSettingsStore } from '../src/stores/settingsStore';

describe('fork release data', () => {
  it('versions run without gaps from the newest down to F1, dates never increase', () => {
    FORK_RELEASES.forEach((r, i) => {
      expect(r.version).toBe(FORK_RELEASES.length - i);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (i > 0) expect(r.date <= FORK_RELEASES[i - 1]!.date).toBe(true);
    });
    expect(CURRENT_FORK_VERSION).toBe(FORK_RELEASES[0]!.version);
  });

  it('every text exists in German and English, items are sentences without a trailing period', () => {
    for (const r of FORK_RELEASES) {
      expect(r.title.de.trim() && r.title.en.trim()).toBeTruthy();
      expect(r.sections.length).toBeGreaterThan(0);
      for (const s of r.sections) {
        expect(['added', 'changed', 'fixed']).toContain(s.kind);
        expect(s.items.length).toBeGreaterThan(0);
        for (const item of s.items) {
          for (const text of [item.de, item.en]) {
            expect(text.trim().length).toBeGreaterThan(0);
            expect(text.endsWith('.'), `trailing period in F${r.version}: ${text}`).toBe(false);
          }
        }
      }
      expect(new Set(r.sections.map((s) => s.kind)).size).toBe(r.sections.length);
    }
  });

  it('forkReleasesSince and pickText', () => {
    expect(forkReleasesSince(null)).toEqual([]);
    expect(forkReleasesSince(0)).toHaveLength(FORK_RELEASES.length);
    expect(forkReleasesSince(CURRENT_FORK_VERSION)).toEqual([]);
    expect(forkReleasesSince(CURRENT_FORK_VERSION - 1).map((r) => r.version)).toEqual([CURRENT_FORK_VERSION]);
    const text = { de: 'Hallo', en: 'Hello' };
    expect(pickText(text, 'de')).toBe('Hallo');
    expect(pickText(text, 'de-AT')).toBe('Hallo');
    expect(pickText(text, 'en')).toBe('Hello');
    expect(pickText(text, 'fr')).toBe('Hello');
  });

  it('CHANGELOG.fork.md is current (regenerate with packages/core/scripts/gen-fork-changelog.mjs)', () => {
    const file = readFileSync(fileURLToPath(new URL('../../../CHANGELOG.fork.md', import.meta.url)), 'utf8');
    expect(file).toBe(renderForkChangelogMarkdown());
  });
});

describe('changelog entries', () => {
  const up = (version: string, date: string): Release => ({ version, date, title: `U ${version}`, sections: [{ kind: 'fixed', items: ['x'] }] });

  it('merges by date, newest first; on the same day the fork release comes first; texts in the UI language', () => {
    const fork = FORK_RELEASES.filter((r) => r.date === '2026-09-26' || r.date === '2026-09-25');
    const entries = changelogEntries([up('9.9.9', '2026-09-26'), up('9.9.8', '2026-08-01')], fork, 'de');
    expect(entries.map((e) => e.release.version)).toEqual(['F9', 'F8', '9.9.9', 'F7', '9.9.8']);
    expect(entries[0]!.isFork).toBe(true);
    expect(entries[0]!.release.title).toBe(FORK_RELEASES.find((r) => r.version === 9)!.title.de);
    expect(changelogEntries([], fork, 'en')[0]!.release.title).toBe(FORK_RELEASES.find((r) => r.version === 9)!.title.en);
  });

  it('the history holds every upstream and every fork release', () => {
    const all = changelogEntries(RELEASES, FORK_RELEASES, 'de');
    expect(all).toHaveLength(RELEASES.length + FORK_RELEASES.length);
    expect(new Set(all.map((e) => e.key)).size).toBe(all.length);
  });

  it("What's New: up to two in full, beyond that the newest in full and the rest as titles", () => {
    const e = changelogEntries([], FORK_RELEASES, 'de');
    expect(splitWhatsNew(e.slice(0, 2))).toEqual({ full: e.slice(0, 2), compact: [] });
    const s = splitWhatsNew(e);
    expect(s.full.map((x) => x.release.version)).toEqual([`F${CURRENT_FORK_VERSION}`]);
    expect(s.compact).toHaveLength(e.length - 1);
  });
});

describe('lastSeenFork', () => {
  const merge = useSettingsStore.persist.getOptions().merge!;
  const current = () => useSettingsStore.getState();

  it('fresh install (nothing persisted) has nothing to catch up on — neither fork nor upstream releases', () => {
    expect(merge(undefined, current()).lastSeenFork).toBe(CURRENT_FORK_VERSION);
    expect(merge(undefined, current()).lastSeenVersion).toBe(CURRENT_VERSION);
    expect(merge({ theme: 'aurora' }, current()).lastSeenVersion).toBe('1.0.0'); // upgrade from before the changelog
  });

  it('a state saved before the field existed sees every fork release once; stored values are kept, junk is 0', () => {
    expect(merge({ lastSeenVersion: '1.3.2' }, current()).lastSeenFork).toBe(0);
    expect(merge({ lastSeenFork: 5 }, current()).lastSeenFork).toBe(5);
    expect(merge({ lastSeenFork: 'x' }, current()).lastSeenFork).toBe(0);
    expect(merge({ lastSeenFork: -1 }, current()).lastSeenFork).toBe(0);
  });

  it('is device-only: never exported, marked seen together with the upstream version', () => {
    useSettingsStore.setState({ lastSeenFork: 0 });
    expect(useSettingsStore.getState().exportSettings()).not.toContain('lastSeenFork');
    useSettingsStore.getState().markVersionSeen();
    expect(useSettingsStore.getState().lastSeenFork).toBe(CURRENT_FORK_VERSION);
  });
});
