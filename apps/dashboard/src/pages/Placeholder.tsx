/**
 * Placeholder — "coming soon" page for sections not yet built.
 *
 * Usage:
 *   <Placeholder title="Devices" icon={Cpu} />
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useT } from '../i18n/useT';
import './Placeholder.css';

interface PlaceholderProps {
  title: string;
  icon: LucideIcon;
}

export function Placeholder({ title, icon: Icon }: PlaceholderProps) {
  const t = useT();
  return (
    <div className="placeholder-page">
      <div className="placeholder-card">
        <div className="placeholder-card__icon-chip">
          <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h1 className="placeholder-card__title">{title}</h1>
        <p className="placeholder-card__body">
          {t('placeholder.body')}
        </p>
      </div>
    </div>
  );
}
