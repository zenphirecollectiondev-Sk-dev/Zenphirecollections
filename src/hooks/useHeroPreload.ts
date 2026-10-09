/**
 * useHeroPreload.ts
 *
 * Injects a <link rel="preload" as="image"> for the first hero slide URL
 * as soon as it is known. This tells the browser to start fetching the image
 * in parallel with JS parsing — maximising LCP performance.
 *
 * On repeat visits the URL comes from localStorage synchronously (before the
 * Supabase fetch resolves), so the preload fires on the very first render.
 */
import { useEffect, useRef } from 'react';

export function useHeroPreload(url: string | null | undefined) {
  const injectedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url || injectedUrl.current === url) return;
    injectedUrl.current = url;

    // Remove any stale preload we injected earlier
    const old = document.querySelector('link[data-hero-preload]');
    if (old) old.remove();

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.setAttribute('fetchpriority', 'high');
    link.setAttribute('data-hero-preload', '1');
    document.head.prepend(link); // prepend = highest priority in the head
  }, [url]);
}
