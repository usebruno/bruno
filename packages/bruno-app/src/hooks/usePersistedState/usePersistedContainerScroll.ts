import { useEffect, useRef, RefObject } from 'react';
import { usePersistenceScope } from './PersistedScopeProvider';

/**
 * Persists and restores scroll position for a DOM scroll container.
 * Finds the nearest scrollable ancestor matching the given selector and tracks its scroll.
 *
 * Uses localStorage directly (no React state) to avoid re-renders on scroll save.
 * This is critical for tabs with many CodeMirror/editor instances where a re-render is expensive.
 *
 * Tracks scroll position in a ref because el.scrollTop is unreliable in cleanup —
 * the browser resets it to 0 when tab content changes (shared .flex-boundary container).
 *
 * @param wrapperRef - ref to an element inside the scrollable container
 * @param selector - CSS selector for the scrollable ancestor (e.g. '.flex-boundary'), or null to use wrapperRef itself
 * @param key - unique persistence key (e.g. `vars-scroll-${item.uid}`)
 * @param enabled - whether to actively track scroll (default: true). When false, skips listener setup.
 * @returns storageKey - the full scoped localStorage key, useful when sharing with other scroll mechanisms
 */
export function usePersistedContainerScroll(
  wrapperRef: RefObject<HTMLElement>,
  selector: string | null,
  key: string,
  enabled: boolean = true
): string {
  const scope = usePersistenceScope();
  const storageKey = scope ? `persisted::${scope}::${key}` : key;

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPosRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const el = selector
      ? wrapperRef.current?.closest(selector) as HTMLElement | null
      : wrapperRef.current;
    if (!el) return;

    // Restore from localStorage (no state, no re-render)
    // Always set scrollTop — including 0 — because .flex-boundary is shared across tabs
    // and may retain the previous tab's scroll position.
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        el.scrollTop = parsed;
        scrollPosRef.current = parsed;
      }
    } catch {}

    const onScroll = () => {
      scrollPosRef.current = el.scrollTop;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(scrollPosRef.current));
      }, 200);
    };
    el.addEventListener('scroll', onScroll);

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      localStorage.setItem(storageKey, JSON.stringify(scrollPosRef.current));
    };
  }, [storageKey, selector, enabled]);

  return storageKey;
}
