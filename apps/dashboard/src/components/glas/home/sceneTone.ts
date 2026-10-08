/**
 * [fork] Colour of a scene tile in Glas (docs/GLAS-DESIGN.md §7.7, plan docs/glas/PLAN-ETAPPE-4.md K83). Klassisch
 * tints the icons by position; Glas gives each scene one of the sketch's colours: by the icon the upstream card picked
 * for its name (sun yellow, moon indigo, TV purple, …), so the colour follows the same keywords, and by position for
 * the plain sparkles (yellow, purple, orange, indigo, the sketch's order). styles/glas/home-cards.css maps the tone to
 * the full colour (active circle, ring), the ink (inactive glyph) and the glyph on the full colour.
 */

import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, Coffee, Moon, Music2, PartyPopper, Sun, Sunset, Tv } from 'lucide-react';

export type GlasSceneTone = 'yellow' | 'orange' | 'purple' | 'indigo' | 'blue' | 'teal';

const BY_ICON = new Map<unknown, GlasSceneTone>([
  [Sun, 'yellow'],
  [Moon, 'indigo'],
  [Sunset, 'orange'],
  [Tv, 'purple'],
  [PartyPopper, 'purple'],
  [BookOpen, 'blue'],
  [Coffee, 'orange'],
  [Music2, 'teal'],
]);

const BY_INDEX: readonly GlasSceneTone[] = ['yellow', 'purple', 'orange', 'indigo'];

export function glasSceneTone(icon: ReactNode, index: number): GlasSceneTone {
  const byIcon = isValidElement(icon) ? BY_ICON.get(icon.type) : undefined;
  return byIcon ?? BY_INDEX[index % BY_INDEX.length]!;
}
