/**
 * PeopleModal — shows all person.* entities with avatar, zone, last_changed.
 */

import React from 'react';
import { Users } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { relativeTime } from '../../security/roomUtils';
import { useShallow } from 'zustand/react/shallow';
import { useEntityStore } from '../../../stores/entityStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useConnectionStore } from '../../../stores/connectionStore';
import { useT } from '../../../i18n/useT';
import './chipmodals.css';

interface PeopleModalProps {
  open: boolean;
  onClose: () => void;
}

export function PeopleModal({ open, onClose }: PeopleModalProps) {
  const t = useT();
  const hiddenEntities = useSettingsStore(
    useShallow((s) => s.customization.hiddenEntities)
  );

  const people = useEntityStore(
    useShallow((s) => {
      return Object.values(s.entities).filter(
        (e) =>
          e.entity_id.startsWith('person.') &&
          !hiddenEntities.includes(e.entity_id)
      );
    })
  );

  const { url } = useConnectionStore(useShallow((s) => ({ url: s.url })));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('home.chipmodals.people.title')}
      icon={<Users size={20} strokeWidth={1.75} />}
    >
      {people.length === 0 ? (
        <EmptyState
          icon={<Users size={32} strokeWidth={1.5} />}
          title={t('home.chipmodals.people.emptyTitle')}
          description={t('home.chipmodals.people.emptyDescription')}
        />
      ) : (
        <div className="people-modal__list" role="list">
          {people.map((person) => {
            const name =
              (person.attributes.friendly_name as string | undefined) ??
              person.entity_id.split('.')[1] ??
              person.entity_id;
            const state = person.state;
            const isHome = state === 'home';
            const entityPicture = person.attributes.entity_picture as
              | string
              | null
              | undefined;
            const avatarUrl =
              entityPicture
                ? entityPicture.startsWith('http')
                  ? entityPicture
                  : url
                  ? `${url}${entityPicture}`
                  : null
                : null;
            const initial = name.charAt(0).toUpperCase();
            const lastChanged = person.last_changed;

            return (
              <div
                key={person.entity_id}
                className="people-modal__row"
                role="listitem"
              >
                {/* Avatar */}
                <div className="people-modal__avatar" aria-hidden="true">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" />
                  ) : (
                    <div className="people-modal__avatar-initial">
                      {initial}
                    </div>
                  )}
                </div>

                {/* Name + zone */}
                <div className="people-modal__info">
                  <span className="people-modal__name">{name}</span>
                  <span
                    className={[
                      'people-modal__zone',
                      isHome
                        ? 'people-modal__zone--home'
                        : state === 'not_home' || state === 'away'
                        ? 'people-modal__zone--away'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isHome
                      ? t('home.chipmodals.people.homeLabel')
                      : state === 'not_home'
                      ? t('home.chipmodals.people.awayLabel')
                      : state}
                  </span>
                </div>

                {/* Last changed */}
                {lastChanged && (
                  <span
                    className="people-modal__time"
                    aria-label={t('home.chipmodals.people.lastChangedAria', {
                      time: relativeTime(t, lastChanged),
                    })}
                  >
                    {relativeTime(t, lastChanged)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
