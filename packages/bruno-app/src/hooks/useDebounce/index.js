import { useState, useEffect } from 'react';

/**
 * Debounces a value on the trailing edge.
 *
 * `value` is compared by identity, so pass a primitive. A value recreated on
 * every render (object, array, inline literal) restarts the timer each render
 * and may never settle.
 *
 * @param {*} value
 * @param {number} delay - Debounce delay in milliseconds.
 * @param {object} [options]
 * @param {(value: *) => boolean} [options.skipDebounce] - Values matching
 *   this predicate are applied immediately instead of being debounced.
 *   This is useful for reset values, such as an empty search query, so a
 *   stale debounced value cannot remain while the input is being cleared.
 */
function useDebounce(value, delay, { skipDebounce } = {}) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const isImmediate = typeof skipDebounce === 'function' && skipDebounce(value);

  useEffect(() => {
    if (isImmediate) {
      setDebouncedValue(value);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, isImmediate]);

  return isImmediate ? value : debouncedValue;
}

export default useDebounce;
