/**
 * [fork] Error boundary around the routed pages.
 *
 * Without it any render error or failed lazy chunk unmounts the whole tree and
 * leaves a blank screen. The boundary keeps the shell (sidebar, header) usable,
 * reloads once for stale deploy chunks and resets when the route changes.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useT, type TFunction } from '../i18n/useT';
import { isChunkLoadError, reloadOnceForChunkError } from './chunkReload';

interface BoundaryProps {
  t: TFunction;
  resetKey: string;
  children: ReactNode;
}

class Boundary extends Component<BoundaryProps, { error: unknown }> {
  override state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadOnceForChunkError()) return;
    console.error('[HAPulse] page crashed', error, info.componentStack);
  }

  override componentDidUpdate(prev: BoundaryProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    const { t } = this.props;
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          minHeight: '40vh',
          textAlign: 'center',
          color: 'var(--text-dim)',
        }}
      >
        <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>{t('app.errorTitle')}</strong>
        <span style={{ fontSize: '0.875rem' }}>{t('app.errorBody')}</span>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          {t('app.reload')}
        </button>
      </div>
    );
  }
}

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const t = useT();
  const { pathname } = useLocation();
  return (
    <Boundary t={t} resetKey={pathname}>
      {children}
    </Boundary>
  );
}
