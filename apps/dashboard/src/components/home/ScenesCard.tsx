/**
 * ScenesCard — favorited scenes as quick-activate tiles.
 * Shows up to 4 in a 2×2 grid; scrolls horizontally when more than 4 are favorited.
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Sparkles, Sun, Moon, Coffee, Tv, Music2, Sunset, PartyPopper, BookOpen, ChevronRight, Star,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Card } from '../ui/Card';
import type { HassEntityMap } from '@hapulse/core';
import { callService } from '../../ha/service';
import { useSettingsStore } from '../../stores/settingsStore';
import { useT } from '../../i18n/useT';
import './ScenesCard.css';

interface ScenesCardProps {
  entities: HassEntityMap;
}

const SCENE_ICON_COLORS = [
  { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  { bg: 'var(--info-soft)', color: 'var(--info)' },
  { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  { bg: 'var(--warning-soft)', color: 'var(--warning)' },
];

/** Pick an icon by scene name keywords */
function sceneIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('morning') || n.includes('sunrise') || n.includes('wake')) return <Sun size={18} strokeWidth={1.75} />;
  if (n.includes('night') || n.includes('sleep') || n.includes('bed')) return <Moon size={18} strokeWidth={1.75} />;
  if (n.includes('relax') || n.includes('chill') || n.includes('calm')) return <Sunset size={18} strokeWidth={1.75} />;
  if (n.includes('movie') || n.includes('cinema') || n.includes('tv')) return <Tv size={18} strokeWidth={1.75} />;
  if (n.includes('music') || n.includes('party')) return <PartyPopper size={18} strokeWidth={1.75} />;
  if (n.includes('read') || n.includes('study') || n.includes('focus')) return <BookOpen size={18} strokeWidth={1.75} />;
  if (n.includes('coffee') || n.includes('breakfast')) return <Coffee size={18} strokeWidth={1.75} />;
  if (n.includes('concert') || n.includes('audio') || n.includes('sound')) return <Music2 size={18} strokeWidth={1.75} />;
  return <Sparkles size={18} strokeWidth={1.75} />;
}

export function ScenesCard({ entities }: ScenesCardProps) {
  const navigate = useNavigate();
  const t = useT();
  const favorites = useSettingsStore(useShallow((s) => s.customization.favorites));

  const scenes = Object.values(entities)
    .filter((e) => e.entity_id.startsWith('scene.') && favorites.includes(e.entity_id));

  const handleActivate = useCallback((entityId: string) => {
    void callService('scene', 'turn_on', {}, { entity_id: entityId });
  }, []);

  const scrollable = scenes.length > 4;

  return (
    <Card className="scenes-card">
      <div className="scenes-card__header">
        <div className="scenes-card__title-row">
          <span className="scenes-card__icon-chip" aria-hidden="true">
            <Sparkles size={16} strokeWidth={1.75} />
          </span>
          <span className="scenes-card__title">{t('home.scenes.title')}</span>
        </div>
        <button
          className="scenes-card__link"
          onClick={() => void navigate('/scenes')}
          type="button"
          aria-label={t('home.scenes.viewAllAria')}
        >
          {t('home.scenes.allScenes')}
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {scenes.length > 0 ? (
        <div className={`card-scroll-body ${scrollable ? 'scenes-card__scroll-track' : 'scenes-card__grid'}`}>
          {scenes.map((scene, i) => {
            const palette = SCENE_ICON_COLORS[i % SCENE_ICON_COLORS.length]!;
            const name = (scene.attributes.friendly_name ?? scene.entity_id.split('.')[1]!).replace(/_/g, ' ');
            return (
              <button
                key={scene.entity_id}
                className="scene-tile"
                onClick={() => handleActivate(scene.entity_id)}
                aria-label={t('home.scenes.activateAria', { name })}
                type="button"
              >
                <span
                  className="scene-tile__icon"
                  style={{ background: palette.bg, color: palette.color }}
                  aria-hidden="true"
                >
                  {sceneIcon(name)}
                </span>
                <span className="scene-tile__name">{name}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="scenes-card__empty">
          <Star size={28} strokeWidth={1.5} className="scenes-card__empty-icon" />
          <p className="scenes-card__empty-text">{t('home.scenes.emptyTitle')}</p>
          <p className="scenes-card__empty-sub">
            {t('home.scenes.emptyDescription')}
          </p>
        </div>
      )}
    </Card>
  );
}
