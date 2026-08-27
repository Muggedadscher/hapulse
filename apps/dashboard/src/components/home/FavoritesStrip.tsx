/**
 * FavoritesStrip — renders FavoriteTile for each favorited entity that is
 * currently relevant (passes isFavoriteRelevant). Weather is handled separately
 * in the WeatherHero left block, so this strip shows only NON-weather favorites.
 *
 * Renders nothing (null) when there are zero relevant favorites.
 */

import React from 'react';
import { isFavoriteRelevant, domainOf } from '@hapulse/core';
import type { HassEntityMap } from '@hapulse/core';
import type { CustomizationSettings } from '../../stores/settingsStore';
import { FavoriteTile } from './FavoriteTile';
import { useUIStore } from '../../stores/uiStore';
import { useT } from '../../i18n/useT';
import './favorites.css';

interface FavoritesStripProps {
  /** Full entity map from entityStore */
  entities: HassEntityMap;
  /** Customization settings — favorites list + entityOverrides */
  customization: Pick<CustomizationSettings, 'favorites' | 'entityOverrides'>;
}

export function FavoritesStrip({ entities, customization }: FavoritesStripProps) {
  const t = useT();
  const { favorites } = customization;
  // Detail modal is global now (AppLayout mounts one EntityDetailModal).
  const openEntityDetail = useUIStore((s) => s.openEntityDetail);

  // Filter: entity must exist, not be a weather entity (shown in hero left), and be relevant
  const relevantIds = favorites.filter((id) => {
    const entity = entities[id];
    if (!entity) return false;
    if (domainOf(id) === 'weather') return false; // weather stays in the permanent left block
    return isFavoriteRelevant(entity);
  });

  if (relevantIds.length === 0) return null;

  return (
    <div className="favorites-strip" role="list" aria-label={t('home.favorites.listAria')}>
        {relevantIds.map((id) => {
          const entity = entities[id]!;
          return (
            <div key={id} role="listitem">
              <FavoriteTile
                entity={entity}
                customization={customization}
                onOpenDetail={openEntityDetail}
              />
            </div>
          );
        })}
    </div>
  );
}
