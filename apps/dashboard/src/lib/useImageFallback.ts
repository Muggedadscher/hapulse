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

export function useArtworkUrl(url: string | null | undefined): {
  src: string | null;
  onError: () => void;
} {
  const [failed, setFailed] = useState(false);

  // A new URL deserves a fresh attempt (token rotation, track change).
  useEffect(() => {
    setFailed(false);
  }, [url]);

  return {
    src: url != null && url !== '' && !failed ? url : null,
    onError: () => setFailed(true),
  };
}
