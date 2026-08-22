import React, { useCallback } from 'react';
import { PanelTop, ChevronUp, ChevronDown, Square, Blinds, Warehouse } from 'lucide-react';
import { Card } from '../ui/Card';
import { callService } from '../../ha/service';
import { useT } from '../../i18n/useT';
import type { HassEntity } from '@hapulse/core';
import './cards.css';

interface CoverCardProps {
  entity: HassEntity;
  name: string;
}

function coverIcon(deviceClass: string | undefined): React.ReactNode {
  if (deviceClass === 'blind' || deviceClass === 'curtain') {
    return <Blinds size={20} strokeWidth={1.75} />;
  }
  if (deviceClass === 'garage') {
    return <Warehouse size={20} strokeWidth={1.75} />;
  }
  return <PanelTop size={20} strokeWidth={1.75} />;
}

export function CoverCard({ entity, name }: CoverCardProps) {
  const t = useT();
  const entityId = entity.entity_id;
  const position = entity.attributes.current_position as number | undefined;
  const deviceClass = entity.attributes.device_class as string | undefined;
  const isOpen = entity.state === 'open';

  const handleOpen = useCallback(() => {
    void callService('cover', 'open_cover', {}, { entity_id: entityId });
  }, [entityId]);

  const handleStop = useCallback(() => {
    void callService('cover', 'stop_cover', {}, { entity_id: entityId });
  }, [entityId]);

  const handleClose = useCallback(() => {
    void callService('cover', 'close_cover', {}, { entity_id: entityId });
  }, [entityId]);

  return (
    <Card className="cover-card">
      {/* Header: chip + name/position */}
      <div className="cover-card__header">
        <div className={`icon-chip cover-card__chip${isOpen ? ' cover-card__chip--open' : ''}`}>
          {coverIcon(deviceClass)}
        </div>
        <div className="cover-card__info">
          <div className="cover-card__name">{name}</div>
          <div className="cover-card__position">
            {position != null ? (
              <span className="data-font">{t('cards.cover.percentOpen', { percent: position })}</span>
            ) : (
              entity.state
            )}
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="cover-card__buttons">
        <button type="button" className="cover-card__btn" onClick={handleOpen} aria-label={t('cards.cover.open')}>
          <ChevronUp size={16} strokeWidth={1.75} />
          {t('cards.cover.open')}
        </button>
        <button type="button" className="cover-card__btn" onClick={handleStop} aria-label={t('cards.cover.stop')}>
          <Square size={14} strokeWidth={1.75} />
          {t('cards.cover.stop')}
        </button>
        <button type="button" className="cover-card__btn" onClick={handleClose} aria-label={t('cards.cover.close')}>
          <ChevronDown size={16} strokeWidth={1.75} />
          {t('cards.cover.close')}
        </button>
      </div>
    </Card>
  );
}
