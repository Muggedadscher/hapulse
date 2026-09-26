/**
 * [fork] One "applying a remote snapshot" flag shared by both settings sync modules
 * (ha/settingsSync.ts for the user's own snapshot, ha/globalSettings.ts for the admin
 * document). Store changes made while it is set came FROM Home Assistant and must not be
 * pushed back — otherwise applying the global settings would write them into every user's
 * personal snapshot.
 */

let depth = 0;

export function applyingRemote(fn: () => void): void {
  depth++;
  try {
    fn();
  } finally {
    depth--;
  }
}

export function isApplyingRemote(): boolean {
  return depth > 0;
}
