/**
 * [fork] The automations page's head in Glas (plan docs/glas/PLAN-TAFELN.md): the last run as the head
 * (name, how long ago), the counts as the tafel's grid — total, active, disabled, categories (counts, no colour).
 * Without any run the head says so ("Zuletzt ausgeführt · Nie"). The facts are those of the classic AutomationHeroCard
 * (same sort, same relative time), which Klassisch keeps.
 */

import React from 'react';
import { CheckCircle, Tag, Workflow, XCircle } from 'lucide-react';
import { formatNumber } from '@hapulse/core';
import type { HassEntity } from '@hapulse/core';
import { Card } from '../../ui/Card';
import { useLocale, useT } from '../../../i18n/useT';
import { formatRelativeTime } from '../../automation/AutomationHeroCard';
import { TafelGrid, TafelHead, TAFEL_ICON } from './Tafel';

interface AutomationsTafelProps {
  automations: HassEntity[];
  categories: string[];
}

export function AutomationsTafel({ automations, categories }: AutomationsTafelProps) {
  const t = useT();
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, locale, { maxDecimals: 0 });
  const total = automations.length;
  const active = automations.filter((e) => e.state === 'on').length;
  const disabled = total - active;

  const lastRan = automations
    .filter((e) => e.attributes.last_triggered != null)
    .sort((a, b) => new Date(b.attributes.last_triggered as string).getTime() - new Date(a.attributes.last_triggered as string).getTime())[0];
  const lastRanName = lastRan
    ? ((lastRan.attributes.friendly_name as string | undefined) ?? lastRan.entity_id.split('.')[1]!.replace(/_/g, ' '))
    : null;
  const lastRanTime = lastRan?.attributes.last_triggered as string | null | undefined;

  return (
    <Card className="auto-hero-card g-tafel">
      {lastRanName ? (
        <TafelHead
          icon={<Workflow size={28} strokeWidth={1.75} />}
          tone="none"
          kicker={t('automations.hero.lastRan')}
          title={lastRanName}
          sub={lastRanTime ? formatRelativeTime(t, lastRanTime) : undefined}
        />
      ) : (
        <TafelHead
          icon={<Workflow size={28} strokeWidth={1.75} />}
          tone="none"
          kicker={t('automations.hero.lastRan')}
          title={t('automations.time.never')}
        />
      )}
      <TafelGrid
        items={[
          { key: 'total', icon: <Workflow size={TAFEL_ICON} strokeWidth={2} />, label: t('automations.title'), value: n(total) },
          { key: 'active', icon: <CheckCircle size={TAFEL_ICON} strokeWidth={2} />, label: t('automations.hero.statActive'), value: n(active) },
          { key: 'disabled', icon: <XCircle size={TAFEL_ICON} strokeWidth={2} />, label: t('automations.hero.statDisabled'), value: n(disabled) },
          { key: 'categories', icon: <Tag size={TAFEL_ICON} strokeWidth={2} />, label: t('automations.hero.categoryLabel', { count: categories.length }), value: n(categories.length) },
        ]}
      />
    </Card>
  );
}
