/**
 * ChangelogModal — release notes, in two modes.
 *
 * `mode="whats-new"` shows only the releases newer than the user's
 * `lastSeenVersion` and, on close, records the running version as seen. It is
 * mounted by AppLayout and opens by itself once after an upgrade.
 *
 * `mode="history"` shows every release and changes nothing. Settings → About
 * opens this one on demand.
 *
 * The release text itself is English (see `packages/core/src/changelog.ts` for
 * why); everything around it — title, section headings, dates, buttons — is
 * translated and locale-formatted.
 */

import { useMemo } from 'react';
import { Sparkles, Plus, RefreshCw, Wrench } from 'lucide-react';
import { RELEASES, CHANGE_KINDS, releasesSince } from '@hapulse/core';
import type { Release, ChangeKind } from '@hapulse/core';
import { Modal } from '../ui/Modal';
import { useT, useLocale } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import './ChangelogModal.css';

const KIND_META: Record<ChangeKind, { icon: typeof Plus; labelKey: TKey; tone: string }> = {
  added:   { icon: Plus,      labelKey: 'changelog.kind.added',   tone: 'positive' },
  changed: { icon: RefreshCw, labelKey: 'changelog.kind.changed', tone: 'info' },
  fixed:   { icon: Wrench,    labelKey: 'changelog.kind.fixed',   tone: 'accent' },
};

function ReleaseEntry({ release, locale }: { release: Release; locale: string }) {
  const t = useT();
  // Parsed as UTC so the date never slips a day for users behind UTC.
  const formattedDate = useMemo(() => {
    const [y, m, d] = release.date.split('-').map(Number);
    if (!y || !m || !d) return release.date;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, d)));
  }, [release.date, locale]);

  return (
    <section className="changelog-release">
      <header className="changelog-release__header">
        <span className="changelog-release__version">{release.version}</span>
        <span className="changelog-release__date">{formattedDate}</span>
      </header>
      <h3 className="changelog-release__title">{release.title}</h3>

      {CHANGE_KINDS.map((kind) => {
        const section = release.sections.find((s) => s.kind === kind);
        if (!section || section.items.length === 0) return null;
        const { icon: Icon, labelKey, tone } = KIND_META[kind];
        return (
          <div key={kind} className="changelog-group">
            <div className={`changelog-group__label changelog-group__label--${tone}`}>
              <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
              {t(labelKey)}
            </div>
            <ul className="changelog-group__items">
              {section.items.map((item) => (
                <li key={item} className="changelog-group__item">{item}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'whats-new' | 'history';
  /** whats-new only: the version the user last saw, deciding what to render. */
  since?: string | null;
}

export function ChangelogModal({ open, onClose, mode, since = null }: ChangelogModalProps) {
  const t = useT();
  const locale = useLocale();

  const releases = mode === 'whats-new' ? releasesSince(since) : RELEASES;

  // AppLayout already declines to mount the what's-new modal with nothing to
  // say; this guards the history view against an empty RELEASES list too.
  if (releases.length === 0) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'whats-new'
        ? t('changelog.whatsNew.title', { version: releases[0]!.version })
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
        {releases.map((release) => (
          <ReleaseEntry key={release.version} release={release} locale={locale} />
        ))}
      </div>
    </Modal>
  );
}
