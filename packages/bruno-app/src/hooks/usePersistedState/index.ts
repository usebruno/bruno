import type { Dispatch, SetStateAction, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePersistenceScope } from './PersistedScopeProvider';

type Options<T> = {
  key: string;
  default: T;
};

export { ScopedPersistenceProvider as PersistedScopeProvider, clearPersistedScope } from './PersistedScopeProvider';

export function usePersistedState<T>(options: Options<T>): [T, Dispatch<SetStateAction<T>>] {
  const scope = usePersistenceScope();
  const storageKey = scope ? `persisted::${scope}::${options.key}` : options.key;

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (parsed !== undefined) return parsed;
      }
    } catch {}
    return options.default ?? undefined;
  });

  // Re-read from localStorage when storageKey changes (e.g. React reuses component instance with different data)
  const prevKeyRef = useRef(storageKey);
  useEffect(() => {
    if (prevKeyRef.current === storageKey) return;
    prevKeyRef.current = storageKey;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (parsed !== undefined) {
          setState(parsed);
          return;
        }
      }
    } catch {}
    setState(options.default ?? undefined);
  }, [storageKey]);

  const onSet = useCallback(
    (value: T | ((prev: T) => T)) => {
      let _next: T;
      if (typeof value === 'function') {
        setState((prev) => {
          _next = (value as (prev: T) => T)(prev);
          localStorage.setItem(storageKey, JSON.stringify(_next));
          return _next;
        });
      } else {
        _next = value;
        setState(_next);
        localStorage.setItem(storageKey, JSON.stringify(_next));
      }
    },
    [storageKey]
  );

  return [state, onSet];
}

type TrackScrollOptions = {
  onChange: (value: number) => void;
  initialValue?: number;
  ref?: RefObject<HTMLElement | null>;
  selector?: string | null;
  enabled?: boolean;
};

/**
 * Tracks scroll position on a DOM scroll container and reports changes via onChange.
 * Debounces at 200ms and flushes on unmount.
 *
 * Compose with usePersistedState for persistence:
 *   const [scroll, setScroll] = usePersistedState({ key: 'my-key', default: 0 });
 *   useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });
 *
 * For CodeMirror editors, use CodeEditor's built-in onScroll/initialScroll props instead:
 *   const [scroll, setScroll] = usePersistedState({ key: 'my-key', default: 0 });
 *   <CodeEditor initialScroll={scroll} onScroll={setScroll} />
 */
export function useTrackScroll(options: TrackScrollOptions): void {
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPosRef = useRef(options.initialValue ?? 0);
  const onChangeRef = useRef(options.onChange);
  onChangeRef.current = options.onChange;

  useEffect(() => {
    if (options.enabled === false || !options.ref) return;

    const el = options.selector
      ? options.ref.current?.closest(options.selector) as HTMLElement | null
      : options.ref.current;
    if (!el) return;

    el.scrollTop = scrollPosRef.current;

    const onScroll = () => {
      scrollPosRef.current = el.scrollTop;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => onChangeRef.current(scrollPosRef.current), 200);
    };

    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      onChangeRef.current(scrollPosRef.current);
    };
  }, [options.ref, options.selector, options.enabled]);
}
