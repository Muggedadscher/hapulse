import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useConnectionStore } from '../../stores/connectionStore';
import { useT } from '../../i18n/useT';
import { Card } from '../ui/Card';
import type { HassEntity } from '@hapulse/core';
import { relativeTime } from './roomUtils';
import './PeopleList.css';

interface PersonRowProps {
  person: HassEntity;
  url: string | null;
  tick: number;
}

function PersonRow({ person, url, tick }: PersonRowProps) {
  const t = useT();
  void tick;
  const name = (person.attributes['friendly_name'] as string | undefined) ?? person.entity_id;
  const pic = person.attributes['entity_picture'] as string | undefined;
  const isHome = person.state === 'home';
  const avatarUrl = pic && url ? `${url}${pic}` : null;
  const when = relativeTime(t, person.last_changed);

  return (
    <div className="people-list__row">
      <div className="people-list__avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="people-list__avatar-img" />
        ) : (
          <div className="people-list__avatar-fallback" aria-hidden="true">
            {name[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className={`people-list__status-dot${isHome ? ' people-list__status-dot--home' : ' people-list__status-dot--away'}`} />
      </div>
      <div className="people-list__info">
        <span className="people-list__name">{name}</span>
        <span className={`people-list__location${isHome ? ' people-list__location--home' : ''}`}>
          {isHome ? t('security.people.home') : t('security.people.away')}
        </span>
      </div>
      <span className="people-list__time">{when}</span>
    </div>
  );
}

interface PeopleListProps {
  people: HassEntity[];
}

export function PeopleList({ people }: PeopleListProps) {
  const t = useT();
  const url = useConnectionStore(useShallow((s) => s.url));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...people].sort((a, b) => {
    const aHome = a.state === 'home' ? 0 : 1;
    const bHome = b.state === 'home' ? 0 : 1;
    return aHome - bHome;
  });

  const homeCount = people.filter((p) => p.state === 'home').length;

  return (
    <Card className="people-list-card">
      <div className="people-list-card__header">
        <div className="people-list-card__title-row">
          <span className="people-list-card__icon-chip">
            <Users size={16} strokeWidth={1.75} />
          </span>
          <span className="people-list-card__title">{t('security.people.title')}</span>
          <span className="people-list-card__count">
            {t('security.people.count', { home: homeCount, total: people.length })}
          </span>
        </div>
      </div>
      <div className="people-list-card__list">
        {sorted.map((person) => (
          <PersonRow key={person.entity_id} person={person} url={url} tick={tick} />
        ))}
      </div>
    </Card>
  );
}
