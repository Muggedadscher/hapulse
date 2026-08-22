import React, { useCallback, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import type { HassEntity } from '@hapulse/core';
import './cards.css';

interface ButtonCardProps {
  entity: HassEntity;
  name: string;
}

export function ButtonCard({ entity, name }: ButtonCardProps) {
  const t = useT();
  const entityId = entity.entity_id;
  const [flash, setFlash] = useState(false);

  const handlePress = useCallback(() => {
    setFlash(true);
    void callService('button', 'press', {}, { entity_id: entityId });
    setTimeout(() => setFlash(false), 600);
  }, [entityId]);

  return (
    <Card className="button-card" active={flash}>
      <div className={`icon-chip button-card__chip${flash ? ' button-card__chip--flash' : ''}`}>
        <PlayCircle size={20} strokeWidth={1.75} />
      </div>
      <span className="button-card__name">{name}</span>
      <button
        type="button"
        className={`button-card__btn${flash ? ' button-card__btn--flash' : ''}`}
        onClick={handlePress}
        aria-label={t('cards.button.pressAria', { name })}
      >
        {t('cards.button.press')}
      </button>
    </Card>
  );
}
