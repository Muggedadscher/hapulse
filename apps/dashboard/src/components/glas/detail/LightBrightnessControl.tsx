/**
 * [fork] The light's brightness in the Glas detail (docs/GLAS-DESIGN.md §7.22, plan docs/glas/PLAN-ETAPPE-4.md K79):
 * a vertical capsule like the Control Center's — yellow fills it from the bottom —, the percentage, since when the
 * light is on or off and a button that switches it. A tap sets the level where it lands (the fill springs there), a
 * drag follows the finger exactly; below 3 % is off. The arrow keys move by 10, Page up/down by 20, Home and End go to
 * 0 and 100. The value is sent once, when the pointer is released or the key let go, and only when it changed
 * (lightLevel.ts); until Home Assistant answers the capsule keeps the new level. A light that cannot be dimmed gets
 * only the button. Colour temperature and colour come from the embedded LightCard (`children`, `colorOnly`): on the
 * phone beside the capsule like the sketch's colour row, from 900 px under it. Looks in styles/glas/detail.css.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Power, Sun } from 'lucide-react';
import type { HassEntity } from '@hapulse/core';
import { callService } from '../../../ha/service';
import { useLocale, useStateLabel, useT } from '../../../i18n/useT';
import { RollingValue } from '../RollingValue';
import { OFF_BELOW, levelAfterKey, levelAt, lightCommand, lightDimmable, lightLevel } from './lightLevel';

/** From this level the fill covers the sun symbol, which then turns dark (§7.22). */
const SUN_COVERED = 14;
/** How long the capsule keeps a sent level when Home Assistant does not answer with a change. */
const KEEP_MS = 5000;
/** A pointer that moved further than this is a drag: the fill follows it without the spring. */
const DRAG_PX = 3;

type Gesture = { kind: 'pointer'; id: number; y: number; moved: boolean } | { kind: 'key' };

/** "09:38" today, else with the date ("6. Okt., 09:38"). */
function sinceText(iso: string, locale: string): string | null {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  const now = new Date();
  const today =
    when.getFullYear() === now.getFullYear() && when.getMonth() === now.getMonth() && when.getDate() === now.getDate();
  const opts: Intl.DateTimeFormatOptions = today
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat(locale, opts).format(when);
}

interface LightBrightnessControlProps {
  entity: HassEntity;
  /** Colour temperature and colour (the LightCard with `colorOnly`, which renders nothing for a light without). */
  children?: ReactNode;
}

export function LightBrightnessControl({ entity, children }: LightBrightnessControlProps) {
  const t = useT();
  const sl = useStateLabel();
  const locale = useLocale();
  const pct = useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale]);

  const id = entity.entity_id;
  const on = entity.state === 'on';
  const level = lightLevel(entity.state, entity.attributes.brightness);
  const dimmable = lightDimmable(entity.attributes.supported_color_modes);

  // The level shown while the user changes it and until Home Assistant answers; null = the entity's own.
  const [local, setLocal] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const capRef = useRef<HTMLDivElement>(null);
  const value = useRef(level);
  const gesture = useRef<Gesture | null>(null);
  const keep = useRef<ReturnType<typeof setTimeout> | null>(null);
  // the entity as the last render saw it, for the handlers
  const entityNow = useRef({ on, level });
  entityNow.current = { on, level };

  // A new state from Home Assistant replaces the kept level, unless the user is changing it right now.
  useEffect(() => {
    if (!gesture.current) setLocal(null);
  }, [on, level]);

  useEffect(
    () => () => {
      if (keep.current) clearTimeout(keep.current);
    },
    [],
  );

  const shown = local ?? level;

  const show = (next: number) => {
    value.current = next;
    setLocal(next);
  };

  /** A change starts: the level kept from the last one no longer runs out. */
  const begin = (g: Gesture) => {
    if (keep.current) clearTimeout(keep.current);
    keep.current = null;
    gesture.current = g;
    value.current = shown;
  };

  /** The change ended: send it if it changed anything, keep showing it until Home Assistant answers. */
  const commit = () => {
    gesture.current = null;
    setDragging(false);
    const cmd = lightCommand(entityNow.current.on, entityNow.current.level, value.current);
    if (!cmd) {
      setLocal(null);
      return;
    }
    void callService('light', cmd.service, cmd.service === 'turn_on' ? { brightness: cmd.brightness } : {}, {
      entity_id: id,
    });
    keep.current = setTimeout(() => {
      keep.current = null;
      if (!gesture.current) setLocal(null);
    }, KEEP_MS);
  };

  /** The level under the pointer, measured on the capsule at rest (it grows a little while dragging). */
  const levelUnder = (y: number) => {
    const cap = capRef.current;
    if (!cap) return value.current;
    const r = cap.getBoundingClientRect();
    return levelAt(y, r.top + (r.height - cap.offsetHeight) / 2, cap.offsetHeight);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || gesture.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // focused for the keys that may follow, but without the keyboard's ring (data-pointer, until a key is pressed)
    e.currentTarget.dataset.pointer = '';
    e.currentTarget.focus({ preventScroll: true });
    begin({ kind: 'pointer', id: e.pointerId, y: e.clientY, moved: false });
    show(levelUnder(e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.kind !== 'pointer' || g.id !== e.pointerId) return;
    if (!g.moved) {
      if (Math.abs(e.clientY - g.y) <= DRAG_PX) return;
      g.moved = true;
      setDragging(true);
    }
    show(levelUnder(e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g?.kind === 'pointer' && g.id === e.pointerId) commit();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g?.kind !== 'pointer' || g.id !== e.pointerId) return;
    gesture.current = null;
    setDragging(false);
    setLocal(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset.pointer;
    if (e.key === ' ') e.preventDefault(); // like a native slider: the space bar does not scroll the window
    if (levelAfterKey(0, e.key) === null || gesture.current?.kind === 'pointer') return;
    e.preventDefault();
    if (!gesture.current) begin({ kind: 'key' });
    show(levelAfterKey(value.current, e.key) ?? value.current);
  };

  // sent when the key is let go (a held key repeats first) or the focus leaves
  const onKeyEnd = () => {
    if (gesture.current?.kind === 'key') commit();
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset.pointer;
    onKeyEnd();
  };

  const toggle = () => {
    if (keep.current) clearTimeout(keep.current);
    keep.current = null;
    setLocal(null);
    void callService('light', on ? 'turn_off' : 'turn_on', {}, { entity_id: id });
  };

  const text = shown < OFF_BELOW ? sl('light', 'off') : pct.format(shown / 100);
  const since = sinceText(entity.last_changed, locale);
  const switchLabel = on ? t('glas.context.turnOff') : t('glas.context.turnOn');

  return (
    <div
      className="g-light"
      data-on={on || undefined}
      data-dimmable={dimmable || undefined}
      data-dragging={dragging || undefined}
    >
      {dimmable && (
        <div
          ref={capRef}
          className="g-light__cap"
          role="slider"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={t('cards.light.brightness')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          aria-valuetext={text}
          data-lit={shown >= SUN_COVERED || undefined}
          style={{ '--g-level': shown } as React.CSSProperties}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyEnd}
          onBlur={onBlur}
        >
          <span className="g-light__fill" aria-hidden="true" />
          <Sun className="g-light__sun" size={20} strokeWidth={2} aria-hidden="true" />
        </div>
      )}
      {dimmable && (
        <span className="g-light__pct" aria-hidden="true">
          {dragging ? text : <RollingValue text={text} value={shown} />}
        </span>
      )}
      {since && (
        <span className="g-light__since">{t(on ? 'glas.light.onSince' : 'glas.light.offSince', { time: since })}</span>
      )}
      <div className="g-light__extra">{children}</div>
      <button type="button" className="g-light__power" aria-label={switchLabel} onClick={toggle}>
        <span className="g-light__power-circle" aria-hidden="true">
          <Power size={24} strokeWidth={2.25} />
        </span>
        <span className="g-light__power-text" aria-hidden="true">
          {switchLabel}
        </span>
      </button>
    </div>
  );
}
