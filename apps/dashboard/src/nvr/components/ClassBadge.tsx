/**
 * [fork] Event-class badge — a small tinted chip with a Lucide glyph per class
 * (Sentinel's own UI uses German initials; icons are language-neutral). Colours
 * come from the `--nvr-c-*` tokens in nvr.css (mapped onto HAPulse semantics).
 */

import React from 'react';
import { User, Car, Bike, PawPrint, Package, Activity } from 'lucide-react';
import { sentinelClassesOf, type SentinelEventClass } from '@hapulse/core';
import type { TFunction, TKey } from '../../i18n/useT';

const ICONS: Record<SentinelEventClass, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  person: User,
  car: Car,
  bike: Bike,
  animal: PawPrint,
  package: Package,
  motion: Activity,
};

const LABEL_KEYS: Record<SentinelEventClass, TKey> = {
  person: 'nvr.class.person',
  car: 'nvr.class.car',
  bike: 'nvr.class.bike',
  animal: 'nvr.class.animal',
  package: 'nvr.class.package',
  motion: 'nvr.class.motion',
};

export function classLabel(t: TFunction, cls: SentinelEventClass): string {
  return t(LABEL_KEYS[cls]);
}

/** "Person, Vehicle" for an event's distinct classes. */
export function eventLabel(t: TFunction, ev: { classes?: string[] | undefined }): string {
  return sentinelClassesOf(ev).map((c) => classLabel(t, c)).join(', ');
}

export function ClassBadge({ cls, size = 18, title }: { cls: SentinelEventClass; size?: number | undefined; title?: string | undefined }) {
  const Icon = ICONS[cls];
  return (
    <span
      className={`nvr-cbadge nvr-cbadge--${cls}`}
      style={{ width: size, height: size }}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <Icon size={Math.round(size * 0.62)} strokeWidth={2.25} />
    </span>
  );
}

/** Badge row for an event (distinct classes, never empty). */
export function EventBadges({ ev, size, t }: { ev: { classes?: string[] | undefined }; size?: number; t: TFunction }) {
  return (
    <>
      {sentinelClassesOf(ev).map((c) => (
        <ClassBadge key={c} cls={c} size={size} title={classLabel(t, c)} />
      ))}
    </>
  );
}
