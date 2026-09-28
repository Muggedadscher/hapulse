/**
 * [fork] ChangelogModal with this fork's own releases (F1, F2, …) next to upstream's.
 *
 * `mode="whats-new"` shows upstream releases newer than `since` and fork releases newer than `sinceFork`. After a
 * longer gap (more than two unseen) only the newest is shown in full and the others as a title list, with a button
 * to expand them in place — closing still marks everything as seen (AppLayout's `closeWhatsNew`).
 * `mode="history"` shows everything, merged by date. Upstream's own modal stays untouched apart from exporting
 * `ReleaseEntry`, which renders both kinds.
 */

import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { RELEASES, CURRENT_VERSION, releasesSince, FORK_RELEASES, CURRENT_FORK_VERSION, forkLabel, forkReleasesSince } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useT, useLocale } from '../../i18n/useT';
import { ReleaseEntry } from './ChangelogModal';
import { changelogEntries, splitWhatsNew } from './forkEntries';
import './ChangelogModal.css';

interface ForkChangelogModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'whats-new' | 'history';
  /** whats-new only: the upstream version the user last saw. */
  since?: string | null;
  /** whats-new only: the fork release the user last saw. */
  sinceFork?: number | null;
}

export function ForkChangelogModal({ open, onClose, mode, since = null, sinceFork = null }: ForkChangelogModalProps) {
  const t = useT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!open) setExpanded(false); }, [open]);

  const entries = useMemo(
    () => mode === 'whats-new'
      ? changelogEntries(releasesSince(since), forkReleasesSince(sinceFork), locale)
      : changelogEntries(RELEASES, FORK_RELEASES, locale),
    [mode, since, sinceFork, locale],
  );
  if (entries.length === 0) return null;

  const { full, compact } = mode === 'whats-new' && !expanded ? splitWhatsNew(entries) : { full: entries, compact: [] };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'whats-new'
        ? t('changelog.whatsNew.title', { version: `${CURRENT_VERSION} · ${forkLabel(CURRENT_FORK_VERSION)}` })
        : t('changelog.history.title')}
      icon={<Sparkles size={18} strokeWidth={1.75} />}
      className="changelog-modal"
      footer={
        <button type="button" className="changelog-modal__done" onClick={onClose}>
          {t(mode === 'whats-new' ? 'changelog.whatsNew.dismiss' : 'common.close')}
        </button>
      }
    >
      <div className="changelog-modal__body">
        {full.map((e) => (
          <ReleaseEntry key={e.key} release={e.release} locale={locale} badge={e.isFork ? t('changelog.fork.badge') : undefined} />
        ))}
        {compact.length > 0 && (
          <section className="changelog-more">
            <h3 className="changelog-more__title">{t('changelog.fork.alsoNew')}</h3>
            <ul className="changelog-more__list">
              {compact.map((e) => (
                <li key={e.key} className="changelog-more__item">
                  <span className="changelog-release__version">{e.release.version}</span>
                  <span>{e.release.title}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn--ghost changelog-more__all" onClick={() => setExpanded(true)}>
              {t('changelog.fork.allDetails')}
            </button>
          </section>
        )}
      </div>
    </Modal>
  );
}
