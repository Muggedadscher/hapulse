/**
 * [fork] Favicon / home-screen icon / web-app manifest follow the "Symbol" chosen in
 * Settings → Appearance: every selectable id has a generated set under /icons
 * (apps/dashboard/scripts/gen-app-icons.mjs). 'pulse' is the default and the
 * fallback for a hidden or unknown symbol. iOS reads the touch icon only when the
 * app is added to the home screen; browsers pick the favicon change up live.
 */
import { APP_ICON_IDS } from '../components/ui/PulseLogo';

let current = '';

export function appIconId(appIcon: string | undefined, hidden: boolean): string {
  if (hidden || !appIcon) return 'pulse';
  return (APP_ICON_IDS as readonly string[]).includes(appIcon) ? appIcon : 'pulse';
}

export function syncAppIcon(appIcon: string | undefined, hidden: boolean): void {
  const id = appIconId(appIcon, hidden);
  if (id === current || typeof document === 'undefined') return;
  current = id;
  const set = (selector: string, href: string) => { const el = document.querySelector<HTMLLinkElement>(selector); if (el) el.href = href; };
  set('link[rel="icon"]', `/icons/${id}.svg`);
  set('link[rel="apple-touch-icon"]', `/icons/${id}-180.png`);
  set('link[rel="manifest"]', `/icons/${id}.webmanifest`);
}
