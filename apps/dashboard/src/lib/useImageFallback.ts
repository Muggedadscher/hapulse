/**
 * useArtworkUrl — an image URL that gives up gracefully.
 *
 * Artwork regularly fails to load even when a URL exists: the hosted (https)
 * dashboard cannot load http:// covers from a LAN Home Assistant or Music
 * Assistant (mixed content, silently blocked), and signed camera/media URLs
 * expire. Components using this hook fall back to their icon placeholder via
 * the same branch that handles "no artwork at all" — pass the resolved URL
 * in, render `src` (null once failed), and wire `onError` onto the <img>.
 */

import { useEffect, useState } from 'react';

/** An https page cannot load http:// images — the browser blocks them before
 *  any request, so don't even try (avoids a console warning per artwork). */
function blockedByMixedContent(url: string): boolean {
  return typeof window !== 'undefined'
    && window.location.protocol === 'https:'
    && url.startsWith('http://');
}

export function useArtworkUrl(
  url: string | null | undefined,
  /** Tried when the primary fails — e.g. Music Assistant's provider artwork. */
  fallbackUrl?: string | null,
): {
  src: string | null;
  onError: () => void;
} {
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);

  // A new URL deserves a fresh attempt (token rotation, track change).
  useEffect(() => {
    setFailedPrimary(false);
  }, [url]);
  useEffect(() => {
    setFailedFallback(false);
  }, [fallbackUrl]);

  const primaryUsable =
    url != null && url !== '' && !failedPrimary && !blockedByMixedContent(url);
  const fallbackUsable =
    fallbackUrl != null && fallbackUrl !== '' && !failedFallback && !blockedByMixedContent(fallbackUrl);

  const src = primaryUsable ? url : fallbackUsable ? fallbackUrl : null;

  return {
    src,
    onError: () => {
      if (primaryUsable) setFailedPrimary(true);
      else setFailedFallback(true);
    },
  };
}
