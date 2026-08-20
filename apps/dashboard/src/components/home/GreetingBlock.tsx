import React from 'react';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/useT';
import './home.css';

interface GreetingBlockProps {
  userName?: string | undefined;
}

function greetingKey(): TKey {
  const hour = new Date().getHours();
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 17) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

/**
 * Overview greeting — "Good morning, Alex 👋" + subtitle.
 * The user avatar / weather / bell live in the app shell header, not here.
 */
export function GreetingBlock({ userName }: GreetingBlockProps) {
  const t = useT();
  const greeting = t(greetingKey());
  const name = userName?.trim();

  return (
    <div className="greeting">
      <h1 className="greeting__title">
        {name ? t('home.greeting.withName', { greeting, name }) : greeting} <span aria-hidden="true">👋</span>
      </h1>
      <p className="greeting__subtitle">{t('home.greeting.subtitle')}</p>
    </div>
  );
}
