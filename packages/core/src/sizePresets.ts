/**
 * [fork] Card sizes S / M / L of the Glas edit mode (docs/GLAS-DESIGN.md §7.32, user decision E6).
 *
 * The presets write the same fields the classic style reads — the column span and the height level — plus
 * the Glas-only `tallSections` entry for L ("2 columns + taller"). Every other combination stays reachable
 * through "⋯ Anpassen" and shows no preset ("Eigene"). Pure, tested in scripts/smoke.mjs.
 */

export type SizePreset = 'S' | 'M' | 'L';

export const SIZE_PRESETS: readonly SizePreset[] = ['S', 'M', 'L'];

export interface SectionSize {
  /** Column span 1–4. */
  span: number;
  /** Height level 0 (no cap) … 4. */
  height: number;
  /** Listed in `tallSections`. */
  tall: boolean;
}

/** The preset a stored size matches, or null ("Eigene"). */
export function sizePresetOf(size: SectionSize): SizePreset | null {
  if (size.height !== 0) return null;
  if (size.span === 1) return size.tall ? null : 'S';
  if (size.span === 2) return size.tall ? 'L' : 'M';
  return null;
}

export function sizeOfPreset(preset: SizePreset): SectionSize {
  if (preset === 'S') return { span: 1, height: 0, tall: false };
  if (preset === 'M') return { span: 2, height: 0, tall: false };
  return { span: 2, height: 0, tall: true };
}

/** Key of a section in `tallSections`: `<page>:<section>` (e.g. `home:energy`). */
export function tallKey(page: string, section: string): string {
  return `${page}:${section}`;
}

/** `tallSections` with the key set or removed (order kept, no duplicates). */
export function withTall(list: readonly string[], key: string, tall: boolean): string[] {
  const rest = list.filter((k) => k !== key);
  return tall ? [...rest, key] : rest;
}
