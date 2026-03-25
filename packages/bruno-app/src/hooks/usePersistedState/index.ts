import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState, useEffect } from 'react';

type Options<T> = {
  key: string;
  default: T;
  clearOnUnmount: boolean;
};

export function usePersistedState<T>(options: Options<T>): [T, Dispatch<SetStateAction<T>>
] {
  const [state, setState] = useState<T>(options.default ?? undefined);

  useEffect(() => {
    const { clearOnUnmount = false } = options;
    const raw = localStorage.getItem(options.key);
    const existingState = JSON.parse(raw);

    if (existingState !== undefined) {
      setState(existingState);
    }

    if (clearOnUnmount) {
      return () => {
        localStorage.removeItem(options.key);
      };
    }

    return;
  }, [options.key, options.clearOnUnmount]);

  const onSet = useCallback((value: T) => {
    setState(value);
    let _next = value;
    if (typeof value === 'function') {
      _next = value(state);
    }
    localStorage.setItem(options.key, JSON.stringify(_next));
  }, [options.key, state]);

  return [state, onSet];
}
