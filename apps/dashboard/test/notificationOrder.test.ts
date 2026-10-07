import { describe, expect, it } from 'vitest';
import { createdMs, newestFirst } from '../src/components/glas/notificationOrder';

// [fork] Glas notifications sheet (stage 3): newest first, rows without a valid time at the end (K57).

const n = (id: string, createdAt?: string) => ({ id, createdAt });
const ids = (list: readonly { id: string }[]) => list.map((e) => e.id);

describe('createdMs', () => {
  it('reads ISO times from HA', () => {
    expect(createdMs(n('a', '2026-10-07T08:12:00.000+00:00'))).toBe(Date.UTC(2026, 9, 7, 8, 12));
  });

  it('gives null for missing or unreadable times', () => {
    expect(createdMs(n('a'))).toBeNull();
    expect(createdMs(n('a', ''))).toBeNull();
    expect(createdMs(n('a', 'gestern'))).toBeNull();
  });
});

describe('newestFirst', () => {
  it('puts the newest first', () => {
    const list = [n('old', '2026-10-06T22:14:00Z'), n('new', '2026-10-07T08:00:00Z'), n('mid', '2026-10-07T06:00:00Z')];
    expect(ids(newestFirst(list))).toEqual(['new', 'mid', 'old']);
  });

  it('keeps rows without a valid time at the end, in HA order', () => {
    const list = [n('x'), n('a', '2026-10-06T22:14:00Z'), n('y', 'kaputt'), n('b', '2026-10-07T08:00:00Z'), n('z')];
    expect(ids(newestFirst(list))).toEqual(['b', 'a', 'x', 'y', 'z']);
  });

  it('keeps HA order for equal times and does not touch the input', () => {
    const list = [n('a', '2026-10-07T08:00:00Z'), n('b', '2026-10-07T08:00:00Z')];
    expect(ids(newestFirst(list))).toEqual(['a', 'b']);
    expect(ids(list)).toEqual(['a', 'b']);
  });
});
