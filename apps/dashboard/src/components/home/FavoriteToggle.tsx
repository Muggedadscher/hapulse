/**
 * [fork] Star in the entity detail modal. Under global admin management favorites are
 * per user, but the only other way to set them (edit mode, admin entity list) is
 * admin-only — this lets every user pin and unpin their own favorites.
 */

import { Star } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '../../stores/settingsStore';
import { useT } from '../../i18n/useT';
import '../settings/GlobalSettings.css';

export function FavoriteToggle({ entityId }: { entityId: string }) {
  const t = useT();
  const favorites = useSettingsStore(useShallow((s) => s.customization.favorites));
  const updateCustomization = useSettingsStore((s) => s.updateCustomization);
  const on = favorites.includes(entityId);
  const label = on ? t('globalSettings.favorite.remove') : t('globalSettings.favorite.add');
  return (
    <button
      type="button"
      className={`entity-detail__fav${on ? ' entity-detail__fav--on' : ''}`}
      onClick={() =>
        updateCustomization({ favorites: on ? favorites.filter((id) => id !== entityId) : [...favorites, entityId] })
      }
      aria-pressed={on}
      aria-label={label}
      title={label}
    >
      <Star size={18} strokeWidth={2} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
