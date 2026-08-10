import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

const SAVE_DEBOUNCE_MS = 200;

export type UseTrackScrollOptions = {
  /** Called with the current scrollTop on every debounced scroll and on unmount. */
  onChange: (value: number) => void;
  /** Scroll position to restore on mount (typically from usePersistedState). */
  initialValue?: number;
  /** Ref to an element inside (or equal to) the scroll container. */
  ref?: RefObject<HTMLElement | null>;
  /** CSS selector for the actual scroll container, tried as a descendant of `ref` first (`querySelector`) then as an ancestor (`closest`). Null/undefined = use `ref` directly. */
  selector?: string | null;
  /** Set false to pause tracking (e.g. edit mode in Docs where CodeEditor handles its own scroll). */
  enabled?: boolean;
  /**
   * Re-apply the restored scroll position while async content is still mounting.
   * Enable only for containers whose content can change size after mount.
 */
  settleAfterAsyncLayout?: boolean;
};

/**
 * Tracks scroll position on a DOM scroll container. Debounces saves at 200ms and flushes on unmount.
 *
 * Compose with usePersistedState for localStorage persistence:
 *   const [scroll, setScroll] = usePersistedState({ key: 'my-key', default: 0 });
 *   useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });
 *
 * For CodeMirror editors, use CodeEditor's built-in onScroll/initialScroll props instead:
 *   const [scroll, setScroll] = usePersistedState({ key: 'my-key', default: 0 });
 *   <CodeEditor initialScroll={scroll} onScroll={setScroll} />
 */

// Time to keep restoring scroll position while async content is mounting.
const LAYOUT_SETTLE_MS = 1000;

export function useTrackScroll(options: UseTrackScrollOptions): void {
  const { onChange, initialValue, ref, selector, enabled = true, settleAfterAsyncLayout = false } = options;

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPosRef = useRef<number>(initialValue ?? 0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !ref) return;

    const el: HTMLElement | null = selector
      ? ((ref.current?.querySelector(selector) as HTMLElement | null)
        ?? (ref.current?.closest(selector) as HTMLElement | null)
        ?? null)
      : ref.current;
    if (!el) return;

    el.scrollTop = scrollPosRef.current;

    // Some content mounts asynchronously after the initial scroll restoration.
    // Watch for DOM changes and re-apply the saved position while the layout settles.
    // Only enable this for consumers that render async content.
    let mutationObserver: MutationObserver | null = null;
    let settleTimeout: ReturnType<typeof setTimeout> | null = null;
    if (settleAfterAsyncLayout && scrollPosRef.current > 0 && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        if (Math.abs(el.scrollTop - scrollPosRef.current) > 1) {
          el.scrollTop = scrollPosRef.current;
        }
      });
      mutationObserver.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
      settleTimeout = setTimeout(() => {
        mutationObserver?.disconnect();
        mutationObserver = null;
      }, LAYOUT_SETTLE_MS);
    }

    const handleScroll = () => {
      scrollPosRef.current = el.scrollTop;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => onChangeRef.current(scrollPosRef.current), SAVE_DEBOUNCE_MS);
    };

    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (settleTimeout) clearTimeout(settleTimeout);
      mutationObserver?.disconnect();
      onChangeRef.current(scrollPosRef.current);
    };
  }, [ref, selector, enabled, settleAfterAsyncLayout]);
}
