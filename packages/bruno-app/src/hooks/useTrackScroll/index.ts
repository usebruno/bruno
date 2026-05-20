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
  /** CSS selector used with `closest()` to find the scrollable ancestor. Null/undefined = use `ref` directly. */
  selector?: string | null;
  /** Set false to pause tracking (e.g. edit mode in Docs where CodeEditor handles its own scroll). */
  enabled?: boolean;
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
export function useTrackScroll(options: UseTrackScrollOptions): void {
  const { onChange, initialValue, ref, selector, enabled = true } = options;

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPosRef = useRef<number>(initialValue ?? 0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !ref) return;

    const el: HTMLElement | null = selector
      ? (ref.current?.closest(selector) as HTMLElement | null) ?? null
      : ref.current;
    if (!el) return;

    el.scrollTop = scrollPosRef.current;

    const handleScroll = () => {
      scrollPosRef.current = el.scrollTop;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => onChangeRef.current(scrollPosRef.current), SAVE_DEBOUNCE_MS);
    };

    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      onChangeRef.current(scrollPosRef.current);
    };
  }, [ref, selector, enabled]);
}
