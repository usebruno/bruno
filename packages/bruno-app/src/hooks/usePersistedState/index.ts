import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';
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
