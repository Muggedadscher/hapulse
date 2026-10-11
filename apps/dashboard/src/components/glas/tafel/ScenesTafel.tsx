/**
 * [fork] The scenes page's head in Glas (plan docs/glas/PLAN-TAFELN.md): the last used scene as the head
 * (name, how long ago), the counts as the tafel's grid — total, used today, rooms. Without any use the head says so
 * ("Zuletzt genutzt · Nie"). The facts are those of the classic SceneHeroCard (a scene's state is its last activation), which
 * Klassisch keeps.
 */

import React from 'react';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { formatNumber } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useLocale, useT } from '../../../i18n/useT';
import { formatRelativeTime } from '../../scenes/SceneHeroCard';
import { TafelGrid, TafelHead, TAFEL_ICON } from './Tafel';

interface ScenesTafelProps {
  scenes: HassEntity[];
  roomCount: number;
}

function sceneName(e: HassEntity): string {
  return (e.attributes.friendly_name as string | undefined) ?? e.entity_id.split('.')[1]!.replace(/_/g, ' ');
}

/** today in the viewer's time zone, as the classic hero counts it */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function ScenesTafel({ scenes, roomCount }: ScenesTafelProps) {
  const t = useT();
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, locale, { maxDecimals: 0 });
  const total = scenes.length;
  const activated = scenes.filter((e) => e.state !== 'unknown');
  const usedToday = activated.filter((e) => isToday(e.state)).length;
  const lastUsed = [...activated].sort((a, b) => new Date(b.state).getTime() - new Date(a.state).getTime())[0];

  return (
    <Card className="scene-hero-card g-tafel">
      {lastUsed ? (
        <TafelHead
          icon={<Sparkles size={28} strokeWidth={1.75} />}
          tone="none"
          kicker={t('scenes.hero.lastUsed')}
          title={sceneName(lastUsed)}
          sub={formatRelativeTime(t, lastUsed.state)}
        />
      ) : (
        <TafelHead
          icon={<Sparkles size={28} strokeWidth={1.75} />}
          tone="none"
          kicker={t('scenes.hero.lastUsed')}
          title={t('scenes.time.never')}
        />
      )}
      <TafelGrid
        label={t('scenes.hero.statsAria')}
        max={3}
        items={[
          { key: 'total', icon: <Sparkles size={TAFEL_ICON} strokeWidth={2} />, label: t('scenes.title'), value: n(total), aria: t('scenes.hero.totalAria', { count: total }) },
          { key: 'today', icon: <Sparkles size={TAFEL_ICON} strokeWidth={2} />, label: t('scenes.hero.statUsedToday'), value: n(usedToday) },
          { key: 'rooms', icon: <LayoutGrid size={TAFEL_ICON} strokeWidth={2} />, label: t('scenes.hero.roomLabel', { count: roomCount }), value: n(roomCount) },
        ]}
      />
    </Card>
  );
}
